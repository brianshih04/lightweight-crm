import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword,
  passwordNeedsUpgrade,
  validatePassword,
  verifyPassword,
} from "../src/lib/password";

test("passwords are salted and verifiable without storing plaintext", async () => {
  const password = "A-strong-test-password-2026!";
  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.notEqual(firstHash, password);
  assert.notEqual(firstHash, secondHash);
  assert.equal(firstHash.startsWith("scrypt$"), true);
  assert.equal(await verifyPassword(password, firstHash), true);
  assert.equal(await verifyPassword("wrong-password", firstHash), false);
  assert.equal(passwordNeedsUpgrade(firstHash), false);
});

test("legacy passwords can be verified once and are marked for upgrade", async () => {
  assert.equal(await verifyPassword("legacy-password", "legacy-password"), true);
  assert.equal(await verifyPassword("wrong", "legacy-password"), false);
  assert.equal(passwordNeedsUpgrade("legacy-password"), true);
});

test("password policy requires 12 to 128 characters", () => {
  assert.match(validatePassword("short") || "", /12/);
  assert.equal(validatePassword("long-enough-password"), null);
  assert.match(validatePassword("x".repeat(129)) || "", /128/);
});
