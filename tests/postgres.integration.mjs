import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL?.startsWith("postgresql://") || process.env.POSTGRES_TEST_DATABASE !== "1") {
  throw new Error("test:postgres requires PostgreSQL and POSTGRES_TEST_DATABASE=1");
}
const databaseUrl = new URL(process.env.DATABASE_URL);
if (!databaseUrl.pathname.slice(1).endsWith("_test")) {
  throw new Error("test:postgres refuses to modify a database whose name does not end in _test");
}

const prisma = new PrismaClient();
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

async function waitForServer(baseUrl) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("PostgreSQL integration server did not become ready");
}

async function request(baseUrl, method, path, cookie, body, idempotencyKey) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.origin = baseUrl;
    headers["sec-fetch-site"] = "same-origin";
  }
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
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
    replayed: response.headers.get("idempotency-replayed"),
  };
}

async function main() {
  await prisma.$transaction([
    prisma.activity.deleteMany(),
    prisma.ticketMessage.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.ticketSequence.deleteMany(),
    prisma.deal.deleteMany(),
    prisma.stage.deleteMany(),
    prisma.pipeline.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.contact.deleteMany(),
    prisma.account.deleteMany(),
    prisma.workflowLog.deleteMany(),
    prisma.workflow.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.emailTemplate.deleteMany(),
    prisma.segment.deleteMany(),
    prisma.authSession.deleteMany(),
    prisma.loginThrottle.deleteMany(),
    prisma.idempotencyRecord.deleteMany(),
    prisma.user.deleteMany(),
    prisma.auditEvent.deleteMany(),
  ]);

  const pipeline = await prisma.pipeline.create({
    data: {
      name: "PostgreSQL verification pipeline",
      isDefault: true,
      stages: { create: { name: "Initial", order: 1, probability: 10 } },
    },
    include: { stages: true },
  });

  const port = await getFreePort();
  const baseUrl = `http://localhost:${port}`;
  serverProcess = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      APP_ORIGIN: baseUrl,
      AUDIT_HASH_SECRET: "postgres-integration-only-audit-secret-123456789",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  serverProcess.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  await waitForServer(baseUrl);

  const health = await request(baseUrl, "GET", "/api/health");
  assert.equal(health.status, 200, health.text);

  const password = `Strong-${randomBytes(18).toString("base64url")}!`;
  const setup = await request(baseUrl, "POST", "/api/auth/setup", null, {
    username: "pg_owner",
    name: "PostgreSQL Owner",
    email: "pg-owner@example.test",
    password,
    passwordConfirm: password,
  });
  assert.equal(setup.status, 201, setup.text);
  const adminCookie = setup.cookie;
  assert.ok(adminCookie);

  const sales = await request(baseUrl, "POST", "/api/users", adminCookie, {
    username: "pg_sales",
    password,
    name: "PostgreSQL Sales",
    email: "pg-sales@example.test",
    role: "SALES",
    region: "NORTH",
    department: "業務部",
    title: "業務代表",
  });
  assert.equal(sales.status, 201, sales.text);
  assert.equal(sales.text.includes('"password"'), false);

  const marketingManager = await request(baseUrl, "POST", "/api/users", adminCookie, {
    username: "pg_marketing_manager",
    password,
    name: "PostgreSQL Marketing Manager",
    email: "pg-marketing-manager@example.test",
    role: "MARKETING_MANAGER",
    region: "ALL",
    department: "市場部",
    title: "市場部主管",
  });
  assert.equal(marketingManager.status, 201, marketingManager.text);
  assert.equal(marketingManager.data.role, "MARKETING_MANAGER");

  const orderAdmin = await request(baseUrl, "POST", "/api/users", adminCookie, {
    username: "pg_order_admin",
    password,
    name: "PostgreSQL Order Admin",
    email: "pg-order-admin@example.test",
    role: "ORDER_ADMIN",
    region: "NORTH",
    department: "業務部",
    title: "訂單管理員",
  });
  assert.equal(orderAdmin.status, 201, orderAdmin.text);
  assert.equal(orderAdmin.data.role, "ORDER_ADMIN");

  const login = await request(baseUrl, "POST", "/api/auth/login", null, {
    username: "pg_sales",
    password,
  });
  assert.equal(login.status, 200, login.text);
  const salesCookie = login.cookie;
  assert.ok(salesCookie);

  // API 建立的使用者須先完成首次改密，否則受保護 API 回 403 PASSWORD_CHANGE_REQUIRED
  const changePassword = await request(baseUrl, "POST", "/api/auth/change-password", salesCookie, {
    currentPassword: password,
    newPassword: `${password}-pg`,
    newPasswordConfirm: `${password}-pg`,
  });
  assert.equal(changePassword.status, 200, changePassword.text);

  const deal = await request(baseUrl, "POST", "/api/deals", salesCookie, {
    title: "PostgreSQL Decimal Deal",
    value: "1234.56",
    pipelineId: pipeline.id,
    stageId: pipeline.stages[0].id,
  });
  assert.equal(deal.status, 201, deal.text);
  assert.equal(deal.data.value, 1234.56);
  assert.equal((await prisma.deal.findUniqueOrThrow({ where: { id: deal.data.id } })).value.toString(), "1234.56");

  const account = await request(baseUrl, "POST", "/api/accounts", salesCookie, {
    name: "PostgreSQL Aggregate Account",
  });
  assert.equal(account.status, 201, account.text);
  const contact = await request(baseUrl, "POST", "/api/contacts", salesCookie, {
    name: "PostgreSQL Aggregate Contact",
    accountId: account.data.id,
  });
  assert.equal(contact.status, 201, contact.text);
  const relatedDeal = await request(baseUrl, "POST", "/api/deals", salesCookie, {
    title: "PostgreSQL Related Decimal Deal",
    value: "10.44",
    pipelineId: pipeline.id,
    stageId: pipeline.stages[0].id,
    accountId: account.data.id,
    contactId: contact.data.id,
  });
  assert.equal(relatedDeal.status, 201, relatedDeal.text);
  const accountList = await request(baseUrl, "GET", "/api/accounts?limit=100", salesCookie);
  const accountSummary = accountList.data.find((item) => item.id === account.data.id);
  assert.equal(accountSummary.contactCount, 1);
  assert.equal(accountSummary.totalDealValue, 10.44);
  const contactList = await request(baseUrl, "GET", "/api/contacts?search=PostgreSQL%20Aggregate", salesCookie);
  assert.equal(contactList.data[0].dealCount, 1);
  const contactOverview = await request(baseUrl, "GET", `/api/contacts/${contact.data.id}`, salesCookie);
  assert.equal(contactOverview.status, 200, contactOverview.text);
  assert.equal(contactOverview.data.dealCount, 1);
  assert.equal("deals" in contactOverview.data, false);
  const relatedDeals = await request(
    baseUrl,
    "GET",
    `/api/contacts/${contact.data.id}/related?type=deals&limit=1`,
    salesCookie
  );
  assert.equal(relatedDeals.status, 200, relatedDeals.text);
  assert.equal(relatedDeals.data[0].value, 10.44);

  const retryKey = `pg-ticket-${randomBytes(12).toString("hex")}`;
  const retryBody = { subject: "PostgreSQL idempotency", description: "same request", priority: "HIGH" };
  const retries = await Promise.all(
    Array.from({ length: 20 }, () => request(baseUrl, "POST", "/api/tickets", salesCookie, retryBody, retryKey))
  );
  for (const response of retries) assert.equal(response.status, 201, response.text);
  assert.equal(new Set(retries.map((response) => response.data.id)).size, 1);
  assert.ok(retries.some((response) => response.replayed === "true"));
  assert.equal(await prisma.ticket.count({ where: { subject: retryBody.subject } }), 1);

  const tickets = await Promise.all(
    Array.from({ length: 100 }, (_, index) => request(baseUrl, "POST", "/api/tickets", salesCookie, {
      subject: `PostgreSQL concurrent ${index}`,
      description: "sequence verification",
      priority: "LOW",
    }))
  );
  for (const response of tickets) assert.equal(response.status, 201, response.text);
  assert.equal(new Set(tickets.map((response) => response.data.ticketNumber)).size, 100);

  const dashboard = await request(baseUrl, "GET", "/api/dashboard", salesCookie);
  assert.equal(dashboard.status, 200, dashboard.text);
  assert.equal(dashboard.data.kpis.totalPipelineValue, 1245);

  const executiveReport = await request(baseUrl, "GET", "/api/reports/executive", adminCookie);
  assert.equal(executiveReport.status, 200, executiveReport.text);
  const salesSummary = executiveReport.data.salesLeaderboard.find((entry) => entry.id === sales.data.id);
  assert.equal(salesSummary.openCount, 2);
  assert.equal(salesSummary.pipelineAmount, 1245);

  await assert.rejects(
    prisma.$executeRawUnsafe(`
      INSERT INTO "Ticket" (
        "id", "ticketNumber", "subject", "description", "status", "priority", "channel", "region", "createdAt", "updatedAt"
      ) VALUES (
        'invalid-enum-ticket', 'INVALID-ENUM', 'Invalid enum', 'must fail', 'NOT_A_STATUS', 'LOW', 'WEB', 'NORTH', NOW(), NOW()
      )
    `)
  );

  const deleted = await request(baseUrl, "DELETE", `/api/users/${sales.data.id}`, adminCookie);
  assert.equal(deleted.status, 200, deleted.text);
  assert.equal((await request(baseUrl, "GET", "/api/dashboard", salesCookie)).status, 401);
  const deactivated = await prisma.user.findUniqueOrThrow({ where: { id: sales.data.id } });
  assert.equal(deactivated.isActive, false);
  assert.ok(deactivated.deletedAt);
  assert.ok(await prisma.auditEvent.count() > 0);

  if (stderr.trim()) throw new Error(`PostgreSQL server stderr:\n${stderr}`);
  console.log("PostgreSQL integration PASS: migration runtime, enums, Decimal, 20-way idempotency, 100-way ticket sequence, soft deletion and audit");
}

try {
  await main();
} finally {
  if (serverProcess && serverProcess.exitCode === null) {
    const exited = new Promise((resolve) => serverProcess.once("exit", resolve));
    serverProcess.kill();
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
  }
  await prisma.$disconnect();
}
