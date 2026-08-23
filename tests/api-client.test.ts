import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiError,
  apiErrorMessage,
  parseApiErrorEnvelope,
} from "../src/lib/api-client";

test("parseApiErrorEnvelope reads the full server error envelope", () => {
  const parsed = parseApiErrorEnvelope(
    {
      error: "請求欄位驗證失敗",
      code: "VALIDATION_ERROR",
      requestId: "req-123",
      issues: [
        { path: "title", message: "商機名稱為必填", code: "too_small" },
        { path: "value", message: "金額必須為正數", code: "custom" },
      ],
    },
    422
  );

  assert.ok(parsed instanceof ApiError);
  assert.equal(parsed.status, 422);
  assert.equal(parsed.code, "VALIDATION_ERROR");
  assert.equal(parsed.requestId, "req-123");
  assert.equal(parsed.issues.length, 2);
  assert.equal(parsed.issues[0].path, "title");
  assert.equal(parsed.issues[0].message, "商機名稱為必填");
});

test("parseApiErrorEnvelope returns null for non-envelope payloads", () => {
  assert.equal(parseApiErrorEnvelope(null, 500), null);
  assert.equal(parseApiErrorEnvelope("server error", 500), null);
  assert.equal(parseApiErrorEnvelope({ unrelated: true }, 500), null);
});

test("parseApiErrorEnvelope tolerates missing optional fields", () => {
  const parsed = parseApiErrorEnvelope({ code: "FORBIDDEN", error: "權限不足" }, 403);
  assert.ok(parsed);
  assert.equal(parsed.requestId, null);
  assert.equal(parsed.issues.length, 0);
});

test("apiErrorMessage prefers field-level issue messages for validation errors", () => {
  const error = parseApiErrorEnvelope(
    {
      error: "請求欄位驗證失敗",
      code: "VALIDATION_ERROR",
      issues: [{ path: "title", message: "商機名稱為必填", code: "too_small" }],
    },
    422
  );
  assert.equal(apiErrorMessage(error), "商機名稱為必填");
});

test("apiErrorMessage falls back to the envelope message without issues", () => {
  const error = parseApiErrorEnvelope({ code: "FORBIDDEN", error: "權限不足" }, 403);
  assert.equal(apiErrorMessage(error), "權限不足");
});

test("apiErrorMessage maps non-API errors to a friendly network message", () => {
  assert.equal(apiErrorMessage(new Error("Failed to fetch")), "無法連線伺服器，請檢查網路後重試");
  assert.equal(apiErrorMessage(undefined), "無法連線伺服器，請檢查網路後重試");
});
