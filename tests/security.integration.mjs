import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const projectRoot = process.cwd();
const prismaDir = join(projectRoot, "prisma");
const databaseName = `security-integration-${process.pid}.db`;
const databasePath = join(prismaDir, databaseName);
const node = process.execPath;
let serverProcess;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function createDatabase() {
  const diff = spawnSync(
    node,
    ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
    { cwd: projectRoot, encoding: "utf8" }
  );
  assert.equal(diff.status, 0, diff.stderr || "Unable to generate test schema SQL");
  const database = new DatabaseSync(databasePath);
  database.exec(diff.stdout);
  database.exec(`
    INSERT INTO Pipeline (id, name, isDefault, createdAt, updatedAt)
    VALUES ('security-pipeline', 'Security Test Pipeline', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    INSERT INTO Stage (id, pipelineId, name, "order", color, probability, createdAt, updatedAt)
    VALUES ('security-stage', 'security-pipeline', 'Initial', 1, '#6366f1', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  `);
  database.close();
}

async function waitForServer(baseUrl) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/setup`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Security integration server did not become ready");
}

async function request(baseUrl, method, path, cookie, body, options = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.origin = baseUrl;
    headers["sec-fetch-site"] = "same-origin";
  }
  if (options.origin === null) delete headers.origin;
  else if (options.origin) headers.origin = options.origin;
  if (options.fetchSite === null) delete headers["sec-fetch-site"];
  else if (options.fetchSite) headers["sec-fetch-site"] = options.fetchSite;
  if (options.ip) headers["x-forwarded-for"] = options.ip;
  if (options.requestId) headers["x-request-id"] = options.requestId;
  if (options.idempotencyKey !== undefined) headers["idempotency-key"] = options.idempotencyKey;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    text,
    data: text ? JSON.parse(text) : null,
    cookie: response.headers.get("set-cookie")?.split(";", 1)[0] || null,
    retryAfter: response.headers.get("retry-after"),
    requestId: response.headers.get("x-request-id"),
    nextCursor: response.headers.get("x-next-cursor"),
    pageSize: response.headers.get("x-page-size"),
    idempotencyReplayed: response.headers.get("idempotency-replayed"),
  };
}

async function rawRequest(baseUrl, method, path, cookie, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      origin: baseUrl,
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body,
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

function sessionTokenHash(cookie) {
  const token = cookie.split("=", 2)[1];
  return createHash("sha256").update(token).digest("hex");
}

function updateSession(cookie, sqlValue) {
  const database = new DatabaseSync(databasePath);
  database.prepare(`UPDATE AuthSession SET ${sqlValue} WHERE tokenHash = ?`).run(sessionTokenHash(cookie));
  database.close();
}

async function main() {
  mkdirSync(prismaDir, { recursive: true });
  createDatabase();
  const port = await getFreePort();
  const baseUrl = `http://localhost:${port}`;
  const password = `Strong-${randomBytes(18).toString("base64url")}!`;
  serverProcess = spawn(node, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DATABASE_URL: `file:./${databaseName}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  serverProcess.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  await waitForServer(baseUrl);

  const health = await request(baseUrl, "GET", "/api/health", null);
  assert.equal(health.status, 200, health.text);
  assert.equal(health.data.status, "ok");
  assert.equal(health.data.database, "ok");

  const setup = await request(baseUrl, "POST", "/api/auth/setup", null, {
    username: "initial_owner",
    name: "Initial Owner",
    email: "owner@example.test",
    password,
    passwordConfirm: password,
  });
  assert.equal(setup.status, 201, setup.text);
  const adminCookie = setup.cookie;
  assert.ok(adminCookie);
  assert.match(setup.requestId, /^[A-Za-z0-9_-]{8,100}$/);

  const preservedRequestId = await request(
    baseUrl,
    "GET",
    "/api/dashboard",
    adminCookie,
    undefined,
    { requestId: "security-request-1234" }
  );
  assert.equal(preservedRequestId.status, 200, preservedRequestId.text);
  assert.equal(preservedRequestId.requestId, "security-request-1234");

  const roleUsers = [
    ["role_gm", "GM", "ALL"],
    ["role_mkt_manager", "MARKETING_MANAGER", "ALL"],
    ["role_manager", "SALES_MANAGER", "NORTH"],
    ["role_order_admin", "ORDER_ADMIN", "NORTH"],
    ["role_sales_n", "SALES", "NORTH"],
    ["role_sales_c", "SALES", "CENTRAL"],
    ["role_marketing", "MARKETING", "ALL"],
    ["role_support", "SUPPORT", "ALL"],
  ];
  const createdUsers = new Map();
  for (const [username, role, region] of roleUsers) {
    const created = await request(baseUrl, "POST", "/api/users", adminCookie, {
      username,
      password,
      name: username,
      email: `${username}@example.test`,
      role,
      region,
      department: role === "SUPPORT" ? "客服部" : ["MARKETING", "MARKETING_MANAGER"].includes(role) ? "行銷部" : "業務部",
      title: role,
    });
    assert.equal(created.status, 201, created.text);
    assert.equal(created.text.includes('"password"'), false);
    createdUsers.set(username, created.data);
  }

  const gmUser = createdUsers.get("role_gm");
  const marketingManager = createdUsers.get("role_mkt_manager");
  const orderAdmin = createdUsers.get("role_order_admin");
  const marketingManagerAssignment = await request(
    baseUrl,
    "PATCH",
    `/api/users/${marketingManager.id}`,
    adminCookie,
    { managerId: gmUser.id }
  );
  assert.equal(marketingManagerAssignment.status, 200, marketingManagerAssignment.text);
  const orderAdminAssignment = await request(
    baseUrl,
    "PATCH",
    `/api/users/${orderAdmin.id}`,
    adminCookie,
    { managerId: createdUsers.get("role_manager").id }
  );
  assert.equal(orderAdminAssignment.status, 200, orderAdminAssignment.text);
  // 訂單管理員是支援單位，允許掛在市場部主管之下
  const orderAdminUnderMarketing = await request(
    baseUrl,
    "PATCH",
    `/api/users/${orderAdmin.id}`,
    adminCookie,
    { managerId: marketingManager.id }
  );
  assert.equal(orderAdminUnderMarketing.status, 200, orderAdminUnderMarketing.text);
  // 市場部主管仍不可擔任 Sales 的主管
  const invalidHierarchyAssignment = await request(
    baseUrl,
    "PATCH",
    `/api/users/${createdUsers.get("role_sales_n").id}`,
    adminCookie,
    { managerId: marketingManager.id }
  );
  assert.equal(invalidHierarchyAssignment.status, 422, invalidHierarchyAssignment.text);
  assert.equal(invalidHierarchyAssignment.data.code, "INVALID_MANAGER_ROLE");
  const gmManagedByAdmin = await request(
    baseUrl,
    "PATCH",
    `/api/users/${gmUser.id}`,
    adminCookie,
    { managerId: setup.data.user.id }
  );
  assert.equal(gmManagedByAdmin.status, 200, gmManagedByAdmin.text);
  const managerCycle = await request(
    baseUrl,
    "PATCH",
    `/api/users/${setup.data.user.id}`,
    adminCookie,
    { managerId: gmUser.id }
  );
  assert.equal(managerCycle.status, 422, managerCycle.text);
  assert.equal(managerCycle.data.code, "MANAGER_CYCLE");
  const selfManager = await request(
    baseUrl,
    "PATCH",
    `/api/users/${gmUser.id}`,
    adminCookie,
    { managerId: gmUser.id }
  );
  assert.equal(selfManager.status, 422, selfManager.text);
  assert.equal(selfManager.data.code, "SELF_MANAGER");

  async function login(username) {
    const response = await request(baseUrl, "POST", "/api/auth/login", null, {
      username,
      password: userPasswords.get(username) ?? password,
    });
    assert.equal(response.status, 200, `${username}: ${response.text}`);
    assert.ok(response.cookie);
    return response.cookie;
  }

  // 初始密碼強制更換：API 建立的使用者首次登入必須先更改密碼才能存取受保護資源
  const userPasswords = new Map();
  for (const [username] of roleUsers) {
    const initialLogin = await request(baseUrl, "POST", "/api/auth/login", null, { username, password });
    assert.equal(initialLogin.status, 200, initialLogin.text);
    assert.equal(initialLogin.data.user.mustChangePassword, true, `${username} 應標記 mustChangePassword`);

    const blocked = await request(baseUrl, "GET", "/api/tickets", initialLogin.cookie);
    assert.equal(blocked.status, 403, blocked.text);
    assert.equal(blocked.data.code, "PASSWORD_CHANGE_REQUIRED");

    const wrongCurrent = await request(baseUrl, "POST", "/api/auth/change-password", initialLogin.cookie, {
      currentPassword: "wrong-current-password",
      newPassword: `${password}-new`,
      newPasswordConfirm: `${password}-new`,
    });
    assert.equal(wrongCurrent.status, 401, wrongCurrent.text);

    const changed = await request(baseUrl, "POST", "/api/auth/change-password", initialLogin.cookie, {
      currentPassword: password,
      newPassword: `${password}-new`,
      newPasswordConfirm: `${password}-new`,
    });
    assert.equal(changed.status, 200, changed.text);
    userPasswords.set(username, `${password}-new`);

    const allowed = await request(baseUrl, "GET", "/api/tickets", initialLogin.cookie);
    assert.equal(allowed.status, 200, allowed.text);
  }
  // 管理者重設密碼後，使用者需再次於登入時更改密碼
  const resetByAdmin = await request(baseUrl, "PATCH", `/api/users/${createdUsers.get("role_sales_n").id}`, adminCookie, {
    password: `${password}-reset`,
  });
  assert.equal(resetByAdmin.status, 200, resetByAdmin.text);
  const afterReset = await request(baseUrl, "POST", "/api/auth/login", null, {
    username: "role_sales_n",
    password: `${password}-reset`,
  });
  assert.equal(afterReset.status, 200, afterReset.text);
  assert.equal(afterReset.data.user.mustChangePassword, true, "重設密碼後應重新標記 mustChangePassword");
  const redoChange = await request(baseUrl, "POST", "/api/auth/change-password", afterReset.cookie, {
    currentPassword: `${password}-reset`,
    newPassword: `${password}-new`,
    newPasswordConfirm: `${password}-new`,
  });
  assert.equal(redoChange.status, 200, redoChange.text);

  // SUPPORT 可擔任 SUPPORT 的主管（客服部門內部階層）；但不可管理 Sales
  const secondSupport = await request(baseUrl, "POST", "/api/users", adminCookie, {
    username: "role_support_2",
    password,
    name: "Second Support",
    email: "role-support-2@example.test",
    role: "SUPPORT",
    region: "ALL",
    department: "客服部",
    title: "客服專員",
  });
  assert.equal(secondSupport.status, 201, secondSupport.text);
  const supportManagedBySupport = await request(
    baseUrl,
    "PATCH",
    `/api/users/${createdUsers.get("role_support").id}`,
    adminCookie,
    { managerId: secondSupport.data.id }
  );
  assert.equal(supportManagedBySupport.status, 200, supportManagedBySupport.text);
  const salesUnderSupport = await request(
    baseUrl,
    "PATCH",
    `/api/users/${createdUsers.get("role_sales_n").id}`,
    adminCookie,
    { managerId: secondSupport.data.id }
  );
  assert.equal(salesUnderSupport.status, 422, salesUnderSupport.text);
  assert.equal(salesUnderSupport.data.code, "INVALID_MANAGER_ROLE");

  const endpoints = [
    "/api/dashboard",
    "/api/accounts",
    "/api/contacts",
    "/api/deals",
    "/api/leads",
    "/api/tickets",
    "/api/marketing/campaigns",
    "/api/marketing/workflows",
    "/api/reports/executive",
    "/api/users",
    "/api/audit",
    "/api/audit/summary",
  ];
  const access = {
    initial_owner: endpoints,
    role_gm: endpoints.filter((path) => !path.startsWith("/api/audit")),
    role_mkt_manager: endpoints.filter((path) => !["/api/deals", "/api/leads", "/api/reports/executive", "/api/users"].includes(path) && !path.startsWith("/api/audit")),
    role_manager: endpoints.filter((path) => !path.includes("marketing") && path !== "/api/users" && !path.startsWith("/api/audit")),
    role_order_admin: endpoints.filter((path) => !path.includes("marketing") && !["/api/reports/executive", "/api/users"].includes(path) && !path.startsWith("/api/audit")),
    role_sales_n: endpoints.filter((path) => !path.includes("marketing") && !["/api/reports/executive", "/api/users"].includes(path) && !path.startsWith("/api/audit")),
    role_marketing: endpoints.filter((path) => !["/api/deals", "/api/leads", "/api/reports/executive", "/api/users"].includes(path) && !path.startsWith("/api/audit")),
    role_support: endpoints.filter((path) => ["/api/dashboard", "/api/accounts", "/api/contacts", "/api/tickets"].includes(path)),
  };
  let matrixChecks = 0;
  for (const [username, allowedPaths] of Object.entries(access)) {
    const cookie = username === "initial_owner" ? adminCookie : await login(username);
    for (const path of endpoints) {
      const response = await request(baseUrl, "GET", path, cookie);
      assert.equal(response.status, allowedPaths.includes(path) ? 200 : 403, `${username} ${path}: ${response.text}`);
      if (response.status === 200) assert.equal(response.text.includes('"password"'), false, `${username} ${path}`);
      matrixChecks += 1;
    }
  }

  for (const path of [
    ...endpoints,
    "/api/contacts/not-found",
    "/api/contacts/not-found/related?type=deals",
    "/api/tickets/not-found",
  ]) {
    const response = await request(baseUrl, "GET", path, null);
    assert.equal(response.status, 401, `anonymous ${path}: ${response.text}`);
  }
  assert.equal((await request(baseUrl, "GET", "/api/dashboard", "crm_auth_session=forged.payload")).status, 401);
  const expiredCookie = await login("role_manager");
  updateSession(expiredCookie, "expiresAt = '2000-01-01T00:00:00.000Z'");
  assert.equal((await request(baseUrl, "GET", "/api/dashboard", expiredCookie)).status, 401);

  const revokedCookie = await login("role_marketing");
  updateSession(revokedCookie, "revokedAt = CURRENT_TIMESTAMP");
  assert.equal((await request(baseUrl, "GET", "/api/dashboard", revokedCookie)).status, 401);

  const northCookie = await login("role_sales_n");
  const centralCookie = await login("role_sales_c");
  const orderAdminCookie = await login("role_order_admin");
  const marketingManagerCookie = await login("role_mkt_manager");
  const supportCookie = await login("role_support");
  const northUser = createdUsers.get("role_sales_n");
  const centralUser = createdUsers.get("role_sales_c");
  const orderAdminUser = createdUsers.get("role_order_admin");

  const orderAdminDeal = await request(baseUrl, "POST", "/api/deals", orderAdminCookie, {
    title: "Order Admin Deal",
    value: "250",
    pipelineId: "security-pipeline",
    stageId: "security-stage",
  });
  assert.equal(orderAdminDeal.status, 201, orderAdminDeal.text);
  assert.equal(orderAdminDeal.data.assignedToId, orderAdminUser.id);
  assert.equal(
    (await request(baseUrl, "POST", "/api/accounts", orderAdminCookie, { name: "Order Admin Account" })).status,
    403
  );

  const managerCampaign = await request(baseUrl, "POST", "/api/marketing/campaigns", marketingManagerCookie, {
    name: "Marketing Manager Campaign",
  });
  assert.equal(managerCampaign.status, 201, managerCampaign.text);

  const contact = await request(baseUrl, "POST", "/api/contacts", northCookie, {
    name: "Scoped Contact",
    email: "scope@example.test",
    region: "CENTRAL",
  });
  assert.equal(contact.status, 201, contact.text);
  assert.equal(contact.data.region, "NORTH");
  assert.equal((await request(baseUrl, "GET", `/api/contacts/${contact.data.id}`, centralCookie)).status, 404);
  assert.equal((await request(baseUrl, "GET", `/api/contacts/${contact.data.id}/related?type=activities`, centralCookie)).status, 404);

  const lead = await request(baseUrl, "POST", "/api/leads", northCookie, {
    name: "Scoped Lead",
    company: "Scoped Company",
    region: "CENTRAL",
    assignedToId: centralUser.id,
  });
  assert.equal(lead.status, 201, lead.text);
  assert.equal(lead.data.region, "NORTH");
  assert.equal(lead.data.assignedToId, northUser.id);
  assert.equal((await request(baseUrl, "POST", "/api/leads", centralCookie, { action: "CONVERT", leadId: lead.data.id, dealValue: "1000" })).status, 404);

  const deal = await request(baseUrl, "POST", "/api/deals", northCookie, {
    title: "Scoped Deal",
    value: "1000",
    pipelineId: "security-pipeline",
    stageId: "security-stage",
    region: "CENTRAL",
    assignedToId: centralUser.id,
  });
  assert.equal(deal.status, 201, deal.text);
  assert.equal(deal.data.region, "NORTH");
  assert.equal(deal.data.assignedToId, northUser.id);
  assert.equal((await request(baseUrl, "PATCH", "/api/deals", centralCookie, { dealId: deal.data.id, status: "WON" })).status, 404);

  // ORDER_ADMIN 為跨市場訂單支援：可讀寫其他市場的商機；Sales 仍被區域+負責人隔離
  const centralDeal = await request(baseUrl, "POST", "/api/deals", centralCookie, {
    title: "Central Market Deal",
    value: "500",
    pipelineId: "security-pipeline",
    stageId: "security-stage",
  });
  assert.equal(centralDeal.status, 201, centralDeal.text);
  assert.equal(centralDeal.data.region, "CENTRAL");

  const orderAdminCentralList = await request(baseUrl, "GET", "/api/deals?region=CENTRAL", orderAdminCookie);
  assert.equal(orderAdminCentralList.status, 200, orderAdminCentralList.text);
  const centralDealTitles = orderAdminCentralList.data.activePipeline.stages
    .flatMap((stage) => stage.deals.map((entry) => entry.title));
  assert.equal(centralDealTitles.includes("Central Market Deal"), true, "訂單管理員應可跨市場讀取商機");

  const orderAdminCrossPatch = await request(baseUrl, "PATCH", "/api/deals", orderAdminCookie, {
    dealId: centralDeal.data.id,
    stageId: "security-stage",
    status: "OPEN",
  });
  assert.equal(orderAdminCrossPatch.status, 200, orderAdminCrossPatch.text);

  const northSeesCentral = await request(baseUrl, "GET", "/api/deals?region=CENTRAL", northCookie);
  assert.equal(northSeesCentral.status, 200, northSeesCentral.text);
  const northTitles = northSeesCentral.data.activePipeline.stages
    .flatMap((stage) => stage.deals.map((entry) => entry.title));
  assert.equal(northTitles.includes("Central Market Deal"), false, "Sales 不可跨市場讀取商機");

  const northDashboard = await request(baseUrl, "GET", "/api/dashboard", northCookie);
  assert.equal(northDashboard.status, 200, northDashboard.text);
  assert.equal(northDashboard.data.kpis.openDealsCount, 1);
  assert.equal(northDashboard.data.kpis.totalPipelineValue, 1000);
  assert.equal(northDashboard.data.pipelineStages.find((stage) => stage.name === "Initial").count, 1);

  // 負向資料隔離：沒有 deals:read 的角色（MARKETING*/SUPPORT）不得取得商機資料
  for (const [label, cookie] of [
    ["marketing_manager", marketingManagerCookie],
    ["support", supportCookie],
  ]) {
    const relatedDeals = await request(
      baseUrl,
      "GET",
      `/api/contacts/${contact.data.id}/related?type=deals`,
      cookie
    );
    assert.equal(relatedDeals.status, 403, `${label} 不應可讀取聯絡人商機: ${relatedDeals.text}`);

    const noDealDashboard = await request(baseUrl, "GET", "/api/dashboard", cookie);
    assert.equal(noDealDashboard.status, 200, noDealDashboard.text);
    assert.equal(noDealDashboard.data.kpis.openDealsCount, 0, `${label} 商機 KPI 應為零`);
    assert.equal(noDealDashboard.data.kpis.totalPipelineValue, 0, `${label} 商機總額應為零`);
    assert.equal(noDealDashboard.data.kpis.wonValue, 0, `${label} 贏單金額應為零`);
    assert.ok(
      noDealDashboard.data.pipelineStages.every((stage) => stage.count === 0),
      `${label} 階段分佈應為零`
    );
    assert.ok(
      noDealDashboard.data.activities.every((activity) => activity.dealId === null),
      `${label} 活動時間軸不得包含商機關聯活動`
    );
  }

  const marketingAccounts = await request(baseUrl, "GET", "/api/accounts?limit=100", marketingManagerCookie);
  assert.equal(marketingAccounts.status, 200, marketingAccounts.text);
  assert.ok(
    marketingAccounts.data.every((entry) => entry.totalDealValue === 0),
    "市場部角色不得看到帳戶商機總額"
  );
  const marketingContacts = await request(baseUrl, "GET", "/api/contacts?search=Scoped", marketingManagerCookie);
  assert.ok(
    marketingContacts.data.every((entry) => entry.dealCount === 0),
    "市場部角色不得看到聯絡人商機數"
  );

  const managerReportCookie = await login("role_manager");
  const managerReport = await request(
    baseUrl,
    "GET",
    "/api/reports/executive?region=SOUTH",
    managerReportCookie
  );
  assert.equal(managerReport.status, 200, managerReport.text);
  assert.deepEqual(managerReport.data.regionalBreakdown.map((entry) => entry.region), ["NORTH"]);
  assert.ok(managerReport.data.salesLeaderboard.every((entry) => entry.region === "NORTH"));
  const centralReport = await request(baseUrl, "GET", "/api/reports/executive?region=CENTRAL", adminCookie);
  assert.equal(centralReport.status, 200, centralReport.text);
  assert.ok(centralReport.data.salesLeaderboard.length > 0);
  assert.ok(centralReport.data.salesLeaderboard.every((entry) => entry.region === "CENTRAL"));

  const ticket = await request(baseUrl, "POST", "/api/tickets", northCookie, {
    subject: "Scoped Ticket",
    description: "Public message",
    priority: "MEDIUM",
  });
  assert.equal(ticket.status, 201, ticket.text);
  assert.equal((await request(baseUrl, "GET", `/api/tickets/${ticket.data.id}`, centralCookie)).status, 404);
  assert.equal((await request(baseUrl, "PATCH", `/api/tickets/${ticket.data.id}`, northCookie, { status: "RESOLVED" })).status, 403);
  assert.equal((await request(baseUrl, "POST", `/api/tickets/${ticket.data.id}`, supportCookie, { content: "Internal only", isInternal: true })).status, 201);
  const salesTicket = await request(baseUrl, "GET", `/api/tickets/${ticket.data.id}`, northCookie);
  const supportTicket = await request(baseUrl, "GET", `/api/tickets/${ticket.data.id}`, supportCookie);
  assert.equal(salesTicket.data.messages.length, 1);
  assert.equal(supportTicket.data.messages.length, 2);

  const unknownField = await request(baseUrl, "POST", "/api/accounts", northCookie, {
    name: "Rejected Contract",
    role: "ADMIN",
  });
  assert.equal(unknownField.status, 422, unknownField.text);
  assert.equal(unknownField.data.code, "VALIDATION_ERROR");
  assert.ok(unknownField.data.requestId);
  const oversized = await request(baseUrl, "POST", "/api/leads", northCookie, {
    name: "Oversized",
    notes: "x".repeat(70 * 1024),
  });
  assert.equal(oversized.status, 413, oversized.text);
  assert.equal(oversized.data.code, "PAYLOAD_TOO_LARGE");
  const unsupported = await rawRequest(
    baseUrl,
    "POST",
    "/api/accounts",
    northCookie,
    JSON.stringify({ name: "Wrong media type" })
  );
  assert.equal(unsupported.status, 415);
  assert.equal(unsupported.data.code, "UNSUPPORTED_MEDIA_TYPE");
  assert.equal((await request(baseUrl, "GET", `/api/contacts?search=${"x".repeat(201)}`, northCookie)).status, 422);
  assert.equal((await request(baseUrl, "GET", "/api/contacts?limit=101", northCookie)).status, 422);

  const paginationContact = await request(baseUrl, "POST", "/api/contacts", northCookie, {
    name: "Pagination Contact",
  });
  assert.equal(paginationContact.status, 201, paginationContact.text);
  const firstPage = await request(baseUrl, "GET", "/api/contacts?limit=1", northCookie);
  assert.equal(firstPage.status, 200, firstPage.text);
  assert.equal(firstPage.data.length, 1);
  assert.equal(firstPage.pageSize, "1");
  assert.ok(firstPage.nextCursor);
  const secondPage = await request(
    baseUrl,
    "GET",
    `/api/contacts?limit=1&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
    northCookie
  );
  assert.equal(secondPage.status, 200, secondPage.text);
  assert.equal(secondPage.data.length, 1);
  assert.notEqual(secondPage.data[0].id, firstPage.data[0].id);

  for (const path of ["/api/deals", "/api/marketing/campaigns", "/api/marketing/workflows"]) {
    const cookie = path === "/api/deals" ? northCookie : await login("role_marketing");
    const response = await request(baseUrl, "GET", `${path}?limit=101`, cookie);
    assert.equal(response.status, 422, `${path}: ${response.text}`);
  }

  const secondDeal = await request(baseUrl, "POST", "/api/deals", northCookie, {
    title: "Paginated Deal",
    value: "2500",
    pipelineId: "security-pipeline",
    stageId: "security-stage",
  });
  assert.equal(secondDeal.status, 201, secondDeal.text);
  const firstDealPage = await request(baseUrl, "GET", "/api/deals?limit=1", northCookie);
  assert.equal(firstDealPage.status, 200, firstDealPage.text);
  assert.equal(firstDealPage.pageSize, "1");
  assert.ok(firstDealPage.nextCursor);
  assert.equal(firstDealPage.data.activePipeline.stages[0].deals.length, 1);
  const secondDealPage = await request(
    baseUrl,
    "GET",
    `/api/deals?limit=1&cursor=${encodeURIComponent(firstDealPage.nextCursor)}`,
    northCookie
  );
  assert.equal(secondDealPage.status, 200, secondDealPage.text);
  assert.notEqual(
    secondDealPage.data.activePipeline.stages[0].deals[0].id,
    firstDealPage.data.activePipeline.stages[0].deals[0].id
  );

  const aggregateAccount = await request(baseUrl, "POST", "/api/accounts", northCookie, {
    name: "Aggregate Account",
  });
  assert.equal(aggregateAccount.status, 201, aggregateAccount.text);
  const aggregateContact = await request(baseUrl, "POST", "/api/contacts", northCookie, {
    name: "Aggregate Contact",
    accountId: aggregateAccount.data.id,
  });
  assert.equal(aggregateContact.status, 201, aggregateContact.text);
  const aggregateDeal = await request(baseUrl, "POST", "/api/deals", northCookie, {
    title: "Aggregate Deal",
    value: "1234.5",
    pipelineId: "security-pipeline",
    stageId: "security-stage",
    accountId: aggregateAccount.data.id,
    contactId: aggregateContact.data.id,
  });
  assert.equal(aggregateDeal.status, 201, aggregateDeal.text);
  const aggregateTicket = await request(baseUrl, "POST", "/api/tickets", northCookie, {
    subject: "Aggregate Ticket",
    description: "Counted without embedding the ticket payload in contact lists",
    accountId: aggregateAccount.data.id,
    contactId: aggregateContact.data.id,
  });
  assert.equal(aggregateTicket.status, 201, aggregateTicket.text);

  const accountList = await request(baseUrl, "GET", "/api/accounts?limit=100", northCookie);
  assert.equal(accountList.status, 200, accountList.text);
  const accountSummary = accountList.data.find((item) => item.id === aggregateAccount.data.id);
  assert.ok(accountSummary, accountList.text);
  assert.equal(accountSummary.contactCount, 1);
  assert.equal(accountSummary.totalDealValue, 1234.5);
  assert.equal("contacts" in accountSummary, false);
  assert.equal("deals" in accountSummary, false);
  assert.equal("tickets" in accountSummary, false);

  const contactList = await request(
    baseUrl,
    "GET",
    "/api/contacts?limit=100&search=Aggregate%20Contact",
    northCookie
  );
  assert.equal(contactList.status, 200, contactList.text);
  assert.equal(contactList.data.length, 1);
  assert.equal(contactList.data[0].dealCount, 1);
  assert.equal(contactList.data[0].ticketCount, 1);
  assert.equal("deals" in contactList.data[0], false);
  assert.equal("tickets" in contactList.data[0], false);

  const secondRelatedDeal = await request(baseUrl, "POST", "/api/deals", northCookie, {
    title: "Second Related Deal",
    value: "1",
    pipelineId: "security-pipeline",
    stageId: "security-stage",
    accountId: aggregateAccount.data.id,
    contactId: aggregateContact.data.id,
  });
  assert.equal(secondRelatedDeal.status, 201, secondRelatedDeal.text);
  const secondRelatedTicket = await request(baseUrl, "POST", "/api/tickets", northCookie, {
    subject: "Second Related Ticket",
    description: "Cursor verification",
    accountId: aggregateAccount.data.id,
    contactId: aggregateContact.data.id,
  });
  assert.equal(secondRelatedTicket.status, 201, secondRelatedTicket.text);
  const overview = await request(baseUrl, "GET", `/api/contacts/${aggregateContact.data.id}`, northCookie);
  assert.equal(overview.status, 200, overview.text);
  assert.equal("deals" in overview.data, false);
  assert.equal("tickets" in overview.data, false);
  assert.equal("activities" in overview.data, false);
  assert.equal(overview.data.dealCount, 2);
  assert.equal(overview.data.ticketCount, 2);
  assert.ok(overview.data.activityCount >= 3);
  assert.equal((await request(baseUrl, "GET", `/api/contacts/${aggregateContact.data.id}/related?type=deals&limit=101`, northCookie)).status, 422);
  assert.equal((await request(baseUrl, "GET", `/api/contacts/${aggregateContact.data.id}/related?type=unknown`, northCookie)).status, 422);
  for (const type of ["deals", "tickets", "activities"]) {
    const firstRelatedPage = await request(
      baseUrl,
      "GET",
      `/api/contacts/${aggregateContact.data.id}/related?type=${type}&limit=1`,
      northCookie
    );
    assert.equal(firstRelatedPage.status, 200, `${type}: ${firstRelatedPage.text}`);
    assert.equal(firstRelatedPage.data.length, 1);
    assert.ok(firstRelatedPage.nextCursor, type);
    const secondRelatedPage = await request(
      baseUrl,
      "GET",
      `/api/contacts/${aggregateContact.data.id}/related?type=${type}&limit=1&cursor=${encodeURIComponent(firstRelatedPage.nextCursor)}`,
      northCookie
    );
    assert.equal(secondRelatedPage.status, 200, `${type}: ${secondRelatedPage.text}`);
    assert.equal(secondRelatedPage.data.length, 1);
    assert.notEqual(secondRelatedPage.data[0].id, firstRelatedPage.data[0].id, type);
  }

  const marketingCookie = await login("role_marketing");
  for (const name of ["Pagination Campaign A", "Pagination Campaign B"]) {
    const created = await request(baseUrl, "POST", "/api/marketing/campaigns", marketingCookie, { name });
    assert.equal(created.status, 201, created.text);
  }
  const firstCampaignPage = await request(baseUrl, "GET", "/api/marketing/campaigns?limit=1", marketingCookie);
  assert.equal(firstCampaignPage.status, 200, firstCampaignPage.text);
  assert.equal(firstCampaignPage.data.campaigns.length, 1);
  assert.ok(firstCampaignPage.nextCursor);
  const secondCampaignPage = await request(
    baseUrl,
    "GET",
    `/api/marketing/campaigns?limit=1&cursor=${encodeURIComponent(firstCampaignPage.nextCursor)}`,
    marketingCookie
  );
  assert.equal(secondCampaignPage.status, 200, secondCampaignPage.text);
  assert.notEqual(secondCampaignPage.data.campaigns[0].id, firstCampaignPage.data.campaigns[0].id);

  for (const name of ["Pagination Workflow A", "Pagination Workflow B"]) {
    const created = await request(baseUrl, "POST", "/api/marketing/workflows", marketingCookie, {
      name,
      triggerEvent: "NEW_LEAD",
      actions: [{ type: "SEND_EMAIL" }],
    });
    assert.equal(created.status, 201, created.text);
  }
  const firstWorkflowPage = await request(baseUrl, "GET", "/api/marketing/workflows?limit=1", marketingCookie);
  assert.equal(firstWorkflowPage.status, 200, firstWorkflowPage.text);
  assert.equal(firstWorkflowPage.data.length, 1);
  assert.ok(firstWorkflowPage.nextCursor);
  const secondWorkflowPage = await request(
    baseUrl,
    "GET",
    `/api/marketing/workflows?limit=1&cursor=${encodeURIComponent(firstWorkflowPage.nextCursor)}`,
    marketingCookie
  );
  assert.equal(secondWorkflowPage.status, 200, secondWorkflowPage.text);
  assert.notEqual(secondWorkflowPage.data[0].id, firstWorkflowPage.data[0].id);

  const idempotencyKey = `ticket-retry-${randomBytes(12).toString("hex")}`;
  const idempotentTicketBody = {
    subject: "Idempotent Ticket",
    description: "This request may be safely retried",
    priority: "MEDIUM",
  };
  const idempotentTickets = await Promise.all(
    Array.from({ length: 20 }, () => request(
      baseUrl,
      "POST",
      "/api/tickets",
      northCookie,
      idempotentTicketBody,
      { idempotencyKey }
    ))
  );
  for (const response of idempotentTickets) assert.equal(response.status, 201, response.text);
  assert.equal(new Set(idempotentTickets.map((response) => response.data.id)).size, 1);
  assert.ok(idempotentTickets.some((response) => response.idempotencyReplayed === "true"));
  const idempotencyDatabase = new DatabaseSync(databasePath);
  const idempotentTicketCount = idempotencyDatabase
    .prepare("SELECT COUNT(*) AS count FROM Ticket WHERE subject = ?")
    .get(idempotentTicketBody.subject);
  const storedIdempotency = idempotencyDatabase
    .prepare("SELECT keyHash FROM IdempotencyRecord WHERE requestPath = ? LIMIT 1")
    .get("/api/tickets");
  idempotencyDatabase.close();
  assert.equal(idempotentTicketCount.count, 1);
  assert.notEqual(storedIdempotency.keyHash, idempotencyKey);
  assert.match(storedIdempotency.keyHash, /^[a-f0-9]{64}$/);
  const conflictingReplay = await request(
    baseUrl,
    "POST",
    "/api/tickets",
    northCookie,
    { ...idempotentTicketBody, subject: "Different payload" },
    { idempotencyKey }
  );
  assert.equal(conflictingReplay.status, 409, conflictingReplay.text);
  assert.equal(conflictingReplay.data.code, "IDEMPOTENCY_CONFLICT");
  const invalidIdempotencyKey = await request(
    baseUrl,
    "POST",
    "/api/tickets",
    northCookie,
    idempotentTicketBody,
    { idempotencyKey: "x".repeat(129) }
  );
  assert.equal(invalidIdempotencyKey.status, 422, invalidIdempotencyKey.text);
  assert.equal(invalidIdempotencyKey.data.code, "INVALID_IDEMPOTENCY_KEY");

  const concurrentTickets = await Promise.all(
    Array.from({ length: 100 }, (_, index) => request(baseUrl, "POST", "/api/tickets", northCookie, {
      subject: `Concurrent Ticket ${index}`,
      description: "Sequence test",
      priority: "LOW",
    }))
  );
  if (concurrentTickets.some((response) => response.status !== 201) && stderr.trim()) {
    console.error(stderr.trim());
  }
  for (const response of concurrentTickets) assert.equal(response.status, 201, response.text);
  assert.equal(new Set(concurrentTickets.map((response) => response.data.ticketNumber)).size, 100);

  assert.equal(
    (await request(
      baseUrl,
      "POST",
      "/api/contacts",
      northCookie,
      { name: "Cross-site request" },
      { origin: "https://attacker.example", fetchSite: "cross-site" }
    )).status,
    403
  );
  assert.equal(
    (await request(baseUrl, "POST", "/api/contacts", northCookie, { name: "Missing origin" }, { origin: null })).status,
    403
  );

  const allDevicesA = await login("role_marketing");
  const allDevicesB = await login("role_marketing");
  assert.equal(
    (await request(baseUrl, "POST", "/api/auth/logout", allDevicesA, { allDevices: true })).status,
    200
  );
  assert.equal((await request(baseUrl, "GET", "/api/dashboard", allDevicesB)).status, 401);

  for (let attempt = 1; attempt <= 9; attempt += 1) {
    const failed = await request(
      baseUrl,
      "POST",
      "/api/auth/login",
      null,
      { username: "rate_limited_identity", password: "incorrect-password" },
      { ip: "203.0.113.44" }
    );
    assert.equal(failed.status, 401, `rate limit attempt ${attempt}: ${failed.text}`);
  }
  const limited = await request(
    baseUrl,
    "POST",
    "/api/auth/login",
    null,
    { username: "rate_limited_identity", password: "incorrect-password" },
    { ip: "203.0.113.44" }
  );
  assert.equal(limited.status, 429, limited.text);
  assert.ok(Number(limited.retryAfter) > 0);
  assert.ok(Number(limited.data.retryAfter) > 0);

  assert.equal(
    (await request(baseUrl, "DELETE", `/api/users/${centralUser.id}`, adminCookie)).status,
    200
  );
  assert.equal((await request(baseUrl, "GET", "/api/dashboard", centralCookie)).status, 401);
  assert.equal(
    (await request(baseUrl, "POST", "/api/auth/login", null, { username: "role_sales_c", password })).status,
    401
  );

  const resetPassword = `Reset-${randomBytes(18).toString("base64url")}!`;
  const supportReset = await request(baseUrl, "PATCH", `/api/users/${createdUsers.get("role_support").id}`, adminCookie, {
    password: resetPassword,
  });
  assert.equal(supportReset.status, 200, supportReset.text);
  assert.equal((await request(baseUrl, "GET", "/api/dashboard", supportCookie)).status, 401);

  const auditApi = await request(baseUrl, "GET", "/api/audit?limit=5&result=SUCCESS", adminCookie);
  assert.equal(auditApi.status, 200, auditApi.text);
  assert.ok(Array.isArray(auditApi.data.items));
  assert.ok(auditApi.data.items.length > 0 && auditApi.data.items.length <= 5);

  const auditSummary = await request(baseUrl, "GET", "/api/audit/summary", adminCookie);
  assert.equal(auditSummary.status, 200, auditSummary.text);
  assert.ok(["OK", "WARNING", "CRITICAL"].includes(auditSummary.data.status));
  assert.ok(Number.isInteger(auditSummary.data.last24h.success));
  assert.ok(Array.isArray(auditSummary.data.alerts));

  const auditDatabase = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const auditSummary = auditDatabase.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'SUCCESS' THEN 1 ELSE 0 END) AS successes,
        SUM(CASE WHEN result = 'DENIED' THEN 1 ELSE 0 END) AS denials,
        SUM(CASE WHEN action = 'login' AND result = 'DENIED' THEN 1 ELSE 0 END) AS deniedLogins,
        SUM(CASE WHEN resource = 'contacts' AND action = 'create' AND result = 'SUCCESS' THEN 1 ELSE 0 END) AS contactCreates,
        SUM(CASE WHEN length(ipHash) = 64 THEN 1 ELSE 0 END) AS hashedIps
      FROM AuditEvent
    `).get();
    assert.ok(auditSummary.total > 0);
    assert.ok(auditSummary.successes > 0);
    assert.ok(auditSummary.denials > 0);
    assert.ok(auditSummary.deniedLogins >= 10);
    assert.ok(auditSummary.contactCreates > 0);
    assert.equal(auditSummary.hashedIps, auditSummary.total);
    const auditDetails = JSON.stringify(
      auditDatabase.prepare("SELECT details FROM AuditEvent WHERE details IS NOT NULL").all()
    );
    assert.equal(auditDetails.includes(password), false);
    assert.equal(auditDetails.includes(resetPassword), false);
    assert.equal(auditDetails.includes("incorrect-password"), false);
    const deletedUserAudit = auditDatabase.prepare(
      "SELECT COUNT(*) AS count FROM AuditEvent WHERE resource = 'users' AND resourceId = ?"
    ).get(centralUser.id);
    assert.ok(deletedUserAudit.count > 0);
    const deactivatedUser = auditDatabase.prepare(
      "SELECT isActive, deletedAt FROM User WHERE id = ?"
    ).get(centralUser.id);
    assert.equal(deactivatedUser.isActive, 0);
    assert.ok(deactivatedUser.deletedAt);
  } finally {
    auditDatabase.close();
  }

  console.log(`Security integration PASS: ${matrixChecks} role checks, opaque sessions, CSRF, request/response contracts, cursor pagination, atomic idempotency, 100 concurrent ticket sequences, soft deletion, durable audit trail, IDOR and internal-note isolation`);
  if (stderr.trim()) console.error(stderr.trim());
}

try {
  await main();
} finally {
  if (serverProcess && serverProcess.exitCode === null) {
    const exited = new Promise((resolve) => serverProcess.once("exit", resolve));
    serverProcess.kill();
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
  }
  if (existsSync(databasePath)) rmSync(databasePath, { force: true });
  for (const suffix of ["-journal", "-shm", "-wal"]) {
    const path = `${databasePath}${suffix}`;
    if (existsSync(path)) rmSync(path, { force: true });
  }
}
