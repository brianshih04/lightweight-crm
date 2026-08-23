import assert from "node:assert/strict";
import test from "node:test";
import {
  hasPermission,
  permissionMatrix,
  type KnownRole,
  type PermissionAction,
  type PermissionResource,
} from "../src/lib/permissions";

const roles: KnownRole[] = ["ADMIN", "GM", "MARKETING_MANAGER", "SALES_MANAGER", "SALES", "ORDER_ADMIN", "MARKETING", "SUPPORT"];
const actions: PermissionAction[] = ["read", "create", "update", "delete", "manage"];

test("permission matrix is default-deny for missing actions and unknown roles", () => {
  for (const resource of Object.keys(permissionMatrix) as PermissionResource[]) {
    for (const action of actions) {
      const configuredRoles = permissionMatrix[resource][action] || [];
      for (const role of roles) {
        assert.equal(
          hasPermission({ role }, resource, action),
          configuredRoles.includes(role),
          `${role} ${action} ${resource}`
        );
      }
      assert.equal(hasPermission({ role: "UNKNOWN" }, resource, action), false);
    }
  }
});

test("only management roles can access user administration", () => {
  for (const action of ["read", "create", "update", "delete", "manage"] as const) {
    assert.equal(hasPermission({ role: "ADMIN" }, "users", action), true);
    assert.equal(hasPermission({ role: "GM" }, "users", action), true);
    for (const role of ["MARKETING_MANAGER", "SALES_MANAGER", "SALES", "ORDER_ADMIN", "MARKETING", "SUPPORT"] as const) {
      assert.equal(hasPermission({ role }, "users", action), false);
    }
  }
});

test("department-specific write permissions stay isolated", () => {
  assert.equal(hasPermission({ role: "SALES" }, "deals", "create"), true);
  assert.equal(hasPermission({ role: "ORDER_ADMIN" }, "deals", "create"), true);
  assert.equal(hasPermission({ role: "ORDER_ADMIN" }, "deals", "update"), true);
  assert.equal(hasPermission({ role: "ORDER_ADMIN" }, "accounts", "create"), false);
  assert.equal(hasPermission({ role: "SALES" }, "campaigns", "create"), false);
  assert.equal(hasPermission({ role: "MARKETING" }, "campaigns", "create"), true);
  assert.equal(hasPermission({ role: "MARKETING_MANAGER" }, "campaigns", "create"), true);
  assert.equal(hasPermission({ role: "MARKETING" }, "tickets", "update"), false);
  assert.equal(hasPermission({ role: "SUPPORT" }, "tickets", "update"), true);
  assert.equal(hasPermission({ role: "SUPPORT" }, "deals", "update"), false);
});

test("executive reports are limited to admin, GM, and sales managers", () => {
  for (const role of roles) {
    const expected = role === "ADMIN" || role === "GM" || role === "SALES_MANAGER";
    assert.equal(hasPermission({ role }, "reports", "read"), expected);
  }
});

test("security audit events are visible only to admins", () => {
  for (const role of roles) {
    assert.equal(hasPermission({ role }, "audit", "read"), role === "ADMIN");
  }
});
