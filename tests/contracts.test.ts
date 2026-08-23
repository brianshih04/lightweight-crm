import assert from "node:assert/strict";
import test from "node:test";
import {
  accountCreateSchema,
  contactListQuerySchema,
  dealCreateSchema,
  initialSetupSchema,
  ticketUpdateSchema,
  userCreateSchema,
} from "../src/lib/contracts";

test("mutation contracts reject unknown fields and invalid enums", () => {
  assert.equal(accountCreateSchema.safeParse({ name: "Acme", role: "ADMIN" }).success, false);
  assert.equal(ticketUpdateSchema.safeParse({ status: "DESTROYED" }).success, false);
  assert.equal(ticketUpdateSchema.safeParse({}).success, false);
});

test("numeric contracts coerce valid form values but reject unsafe amounts", () => {
  const valid = dealCreateSchema.safeParse({
    title: "Deal",
    value: "1250.5",
    pipelineId: "pipeline",
    stageId: "stage",
  });
  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.value, 1250.5);
  assert.equal(dealCreateSchema.safeParse({
    title: "Deal",
    value: "Infinity",
    pipelineId: "pipeline",
    stageId: "stage",
  }).success, false);
});

test("identity contracts normalize email and enforce bootstrap confirmation", () => {
  const user = userCreateSchema.safeParse({
    username: "valid_user",
    password: "a-secure-password",
    name: "Valid User",
    email: "USER@EXAMPLE.TEST",
  });
  assert.equal(user.success, true);
  if (user.success) assert.equal(user.data.email, "user@example.test");
  assert.equal(initialSetupSchema.safeParse({
    username: "owner",
    password: "a-secure-password",
    passwordConfirm: "a-different-password",
    name: "Owner",
    email: "owner@example.test",
  }).success, false);
});

test("list contracts cap query length and page size", () => {
  assert.equal(contactListQuerySchema.safeParse({ limit: "100", search: "ok" }).success, true);
  assert.equal(contactListQuerySchema.safeParse({ limit: "101" }).success, false);
  assert.equal(contactListQuerySchema.safeParse({ search: "x".repeat(201) }).success, false);
});
