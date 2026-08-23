import assert from "node:assert/strict";
import test from "node:test";
import { deriveSecurityAlerts } from "../src/lib/security-monitor";

const sourceHash = "a".repeat(64);

test("security monitor stays quiet below every threshold", () => {
  assert.deepEqual(deriveSecurityAlerts({
    denied15m: 4,
    failures15m: 0,
    activeLoginBlocks: 0,
    topSources15m: [{ ipHash: sourceHash, count: 4 }],
  }), []);
});

test("security monitor promotes threshold breaches and sorts critical first", () => {
  const alerts = deriveSecurityAlerts({
    denied15m: 20,
    failures15m: 1,
    activeLoginBlocks: 5,
    topSources15m: [{ ipHash: sourceHash, count: 10 }],
  });

  assert.deepEqual(alerts.map(({ code, severity }) => ({ code, severity })), [
    { code: "DENIAL_SPIKE", severity: "CRITICAL" },
    { code: "REPEATED_SOURCE", severity: "CRITICAL" },
    { code: "LOGIN_BLOCKS", severity: "CRITICAL" },
    { code: "AUDIT_FAILURES", severity: "WARNING" },
  ]);
});
