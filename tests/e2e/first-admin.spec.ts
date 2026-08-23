import { expect, test } from "@playwright/test";

test("first visitor must choose a password and becomes the only bootstrap ADMIN", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "建立第一位系統管理員" })).toBeVisible();

  const password = page.getByLabel(/^密碼/);
  const confirmation = page.getByLabel("確認密碼");
  await expect(password).toHaveAttribute("required", "");
  await expect(password).toHaveAttribute("minlength", "12");
  await expect(confirmation).toHaveAttribute("required", "");

  await page.getByLabel("姓名").fill("Browser Owner");
  await page.getByLabel("Email").fill("browser-owner@example.test");
  await page.getByLabel("使用者帳號").fill("browser_owner");
  await password.fill("Browser-Admin-Test!2026");
  await confirmation.fill("not-the-same-password");
  await page.getByRole("button", { name: "建立 ADMIN 並登入" }).click();
  await expect(page.getByText("兩次輸入的密碼不一致", { exact: true })).toBeVisible();

  await confirmation.fill("Browser-Admin-Test!2026");
  await page.getByRole("button", { name: "建立 ADMIN 並登入" }).click();
  await page.waitForURL("/");

  await expect.poll(async () => {
    return page.evaluate(async () => {
      const response = await fetch("/api/auth/me");
      return response.json();
    });
  }).toMatchObject({ authenticated: true, user: { role: "ADMIN", username: "browser_owner" } });

  await page.goto("/settings/audit");
  await expect(page.getByRole("heading", { name: "安全稽核與告警" })).toBeVisible();
  await expect(page.getByText("24 小時成功事件")).toBeVisible();
  await expect(page.getByRole("heading", { name: "稽核事件" })).toBeVisible();
  await page.screenshot({ path: ".runtime/audit-dashboard.png", fullPage: true });

  const createGm = await page.request.post("/api/users", {
    headers: { origin: "http://localhost:3200" },
    data: {
      username: "browser_gm",
      password: "Browser-GM-Test!2026",
      name: "Browser GM",
      email: "browser-gm@example.test",
      role: "GM",
      department: "總經理室",
      region: "ALL",
      title: "總經理",
      managerId: null,
    },
  });
  expect(createGm.status()).toBe(201);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("使用者帳號").fill("browser_gm");
  await page.getByLabel("密碼").fill("Browser-GM-Test!2026");
  await page.getByRole("button", { name: "立即登入系統" }).click();

  // API 建立的使用者以初始密碼登入時，必須先完成強制改密
  await page.waitForURL("/change-password");
  await expect(page.getByRole("heading", { name: "首次登入：請設定您的新密碼" })).toBeVisible();
  await page.getByLabel(/目前密碼/).fill("Browser-GM-Test!2026");
  await page.getByLabel(/新密碼（至少/).fill("Browser-GM-Renew!2026");
  await page.getByLabel(/確認新密碼/).fill("Browser-GM-Renew!2026");
  await page.getByRole("button", { name: "設定新密碼並開始使用" }).click();
  await page.waitForURL("/");
  await expect(page.getByRole("link", { name: /安全稽核與告警/ })).toHaveCount(0);
  await page.goto("/settings/audit");
  await page.waitForURL("/");
  await expect(page.getByRole("heading", { name: "安全稽核與告警" })).toHaveCount(0);

  const setupState = await page.request.get("/api/auth/setup");
  expect(setupState.status()).toBe(200);
  await expect(setupState.json()).resolves.toEqual({ needsSetup: false });

  const repeatedSetup = await page.request.post("/api/auth/setup", {
    headers: { origin: "http://localhost:3200" },
    data: {
      username: "second_owner",
      name: "Second Owner",
      email: "second-owner@example.test",
      password: "Second-Admin-Test!2026",
      passwordConfirm: "Second-Admin-Test!2026",
    },
  });
  expect(repeatedSetup.status()).toBe(409);

  await page.context().clearCookies();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "登入 NexCRM 系統" })).toBeVisible();
  await expect(page.getByLabel("姓名")).toHaveCount(0);

  await page.getByLabel("使用者帳號").fill("browser_owner");
  await page.getByLabel("密碼").fill("Browser-Admin-Test!2026");
  await page.getByRole("button", { name: "立即登入系統" }).click();
  await page.waitForURL("/");
  await expect.poll(async () => {
    return page.evaluate(async () => (await fetch("/api/auth/me")).json());
  }).toMatchObject({ authenticated: true, user: { role: "ADMIN" } });

  const createContact = await page.request.post("/api/contacts", {
    headers: { origin: "http://localhost:3200" },
    data: { name: "Browser Contact", email: "browser-contact@example.test" },
  });
  expect(createContact.status()).toBe(201);
  const contact = await createContact.json();
  await page.goto(`/contacts/${contact.id}`);
  await expect(page.getByRole("heading", { name: "Browser Contact" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "關聯商機 (0)" })).toBeVisible();
  await expect(page.getByText("建立了新聯絡人 Browser Contact")).toBeVisible();
  await page.getByRole("tab", { name: "售後工單 (0)" }).click();
  await expect(page.getByText("尚無售後工單記錄")).toBeVisible();
});
