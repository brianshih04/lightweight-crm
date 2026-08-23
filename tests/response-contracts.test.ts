import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import {
  authenticatedResponseSchema,
  publicUserResponseSchema,
  ticketResponseSchema,
  dealResponseSchema,
} from "../src/lib/response-contracts";

const publicUser = {
  id: "user-1",
  username: "safe-user",
  password: "must-not-cross-the-boundary",
  name: "Safe User",
  email: "safe@example.com",
  avatar: null,
  role: "SALES",
  department: "業務部",
  region: "NORTH",
  title: "業務代表",
  managerId: null,
  createdAt: new Date("2026-08-23T00:00:00.000Z"),
  updatedAt: new Date("2026-08-23T00:00:00.000Z"),
};

test("response DTO schemas strip fields outside the allowlist", () => {
  const result = publicUserResponseSchema.parse(publicUser);
  assert.equal("password" in result, false);

  const auth = authenticatedResponseSchema.parse({ success: true, user: publicUser });
  assert.equal("password" in auth.user, false);
});

test("response DTO schemas reject incomplete or non-finite output", () => {
  assert.equal(publicUserResponseSchema.safeParse({ id: "incomplete" }).success, false);
  assert.equal(ticketResponseSchema.safeParse({
    id: "ticket-1",
    ticketNumber: "TICK-2026-000001",
    subject: "Invalid date/value shape",
  }).success, false);
});

test("deal response converts Prisma Decimal at the API boundary", () => {
  const result = dealResponseSchema.parse({
    id: "deal-1",
    title: "Exact money",
    value: new Prisma.Decimal("1234567"),
    currency: "TWD",
    region: "NORTH",
    pipelineId: "pipeline-1",
    stageId: "stage-1",
    contactId: null,
    accountId: null,
    assignedToId: null,
    status: "OPEN",
    expectedCloseDate: null,
    notes: null,
    createdAt: new Date("2026-08-23T00:00:00.000Z"),
    updatedAt: new Date("2026-08-23T00:00:00.000Z"),
  });
  assert.equal(result.value, 1_234_567);
});
