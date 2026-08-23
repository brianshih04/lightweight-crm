import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

delete process.env.NO_COLOR;

const baseURL = "http://localhost:3200";
const databaseUrl = readFileSync(resolve(".runtime", "e2e-database-url"), "utf8").trim();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: ".runtime/playwright-report", open: "never" }]]
    : "line",
  outputDir: ".runtime/playwright-results",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npm start -- -H localhost -p 3200",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: databaseUrl,
      APP_ORIGIN: baseURL,
      AUDIT_HASH_SECRET: "browser-e2e-only-audit-secret-at-least-32-characters",
      NEXT_OUTPUT: "",
    },
  },
});
