import assert from "node:assert/strict";
import test from "node:test";
import { inspectManagerHierarchy } from "../src/lib/user-hierarchy";

function parentLoader(entries: Record<string, string | null>) {
  const visited: string[] = [];
  return {
    visited,
    loadParentId: async (id: string) => {
      visited.push(id);
      return entries[id] ?? null;
    },
  };
}

test("manager hierarchy accepts an acyclic ancestor chain without scanning unrelated users", async () => {
  const loader = parentLoader({ manager: "director", director: null, unrelated: "someone" });
  const result = await inspectManagerHierarchy({
    targetUserId: "employee",
    managerId: "manager",
    loadParentId: loader.loadParentId,
  });
  assert.equal(result, null);
  assert.deepEqual(loader.visited, ["manager", "director"]);
});

test("manager hierarchy detects both target cycles and pre-existing ancestor cycles", async () => {
  const targetCycle = parentLoader({ manager: "employee" });
  assert.equal(await inspectManagerHierarchy({
    targetUserId: "employee",
    managerId: "manager",
    loadParentId: targetCycle.loadParentId,
  }), "cycle");

  const ancestorCycle = parentLoader({ manager: "director", director: "manager" });
  assert.equal(await inspectManagerHierarchy({
    targetUserId: "employee",
    managerId: "manager",
    loadParentId: ancestorCycle.loadParentId,
  }), "cycle");
});

test("manager hierarchy rejects chains beyond the configured maximum depth", async () => {
  const loader = parentLoader({ one: "two", two: "three", three: null });
  assert.equal(await inspectManagerHierarchy({
    targetUserId: "employee",
    managerId: "one",
    loadParentId: loader.loadParentId,
    maxDepth: 2,
  }), "too_deep");
  assert.deepEqual(loader.visited, ["one", "two"]);
});
