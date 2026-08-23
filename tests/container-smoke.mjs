import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const password = process.env.CONTAINER_TEST_PASSWORD ?? "Container-Test-Admin!2026";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { response, body, text };
}

const health = await request("/api/health");
assert.equal(health.response.status, 200, health.text);
assert.equal(health.body.status, "ok");
assert.equal(health.body.database, "ok");

const initialState = await request("/api/auth/setup");
assert.equal(initialState.response.status, 200, initialState.text);
assert.equal(initialState.body.needsSetup, true, "Smoke test requires a clean database");

const headers = { "content-type": "application/json", origin: baseUrl };
const missingPassword = await request("/api/auth/setup", {
  method: "POST",
  headers,
  body: JSON.stringify({
    username: "initial_owner",
    name: "Initial Owner",
    email: "owner@example.test",
  }),
});
assert.equal(missingPassword.response.status, 422, missingPassword.text);

const setupPayload = {
  username: "initial_owner",
  name: "Initial Owner",
  email: "owner@example.test",
  password,
  passwordConfirm: password,
};
const setup = await request("/api/auth/setup", {
  method: "POST",
  headers,
  body: JSON.stringify(setupPayload),
});
assert.equal(setup.response.status, 201, setup.text);
assert.equal(setup.body.user.role, "ADMIN");

const setCookie = setup.response.headers.get("set-cookie") ?? "";
const cookie = setCookie.split(";", 1)[0];
assert.ok(cookie.includes("="), "Setup response must issue a session cookie");
assert.match(setCookie, /;\s*Secure/i);
assert.match(setCookie, /;\s*HttpOnly/i);
assert.match(setCookie, /SameSite=Lax/i);

const authenticated = await request("/api/auth/me", {
  headers: { cookie },
});
assert.equal(authenticated.response.status, 200, authenticated.text);
assert.equal(authenticated.body.authenticated, true);
assert.equal(authenticated.body.user.role, "ADMIN");

const securitySummary = await request("/api/audit/summary", {
  headers: { cookie },
});
assert.equal(securitySummary.response.status, 200, securitySummary.text);
assert.ok(["OK", "WARNING", "CRITICAL"].includes(securitySummary.body.status));
assert.ok(Number.isInteger(securitySummary.body.last24h.success));
assert.ok(Array.isArray(securitySummary.body.alerts));

const repeatedSetup = await request("/api/auth/setup", {
  method: "POST",
  headers,
  body: JSON.stringify(setupPayload),
});
assert.equal(repeatedSetup.response.status, 409, repeatedSetup.text);

const anonymousDashboard = await request("/api/dashboard");
assert.equal(anonymousDashboard.response.status, 401, anonymousDashboard.text);

const login = await request("/api/auth/login", {
  method: "POST",
  headers,
  body: JSON.stringify({ username: setupPayload.username, password }),
});
assert.equal(login.response.status, 200, login.text);
assert.equal(login.body.user.role, "ADMIN");

console.log("Container smoke test passed: migration, readiness, bootstrap, password requirement, ADMIN role, session and anonymous denial.");
