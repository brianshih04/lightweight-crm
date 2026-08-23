import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { apiError } from "./api-response";
import { prisma } from "./prisma";
import { serializeSqliteWrite } from "./write-serialization";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const IDEMPOTENCY_KEY_PATTERN = /^[\x21-\x7e]{1,128}$/;

interface IdempotentMutationOptions<T> {
  request: Request;
  actorId: string;
  payload: unknown;
  responseSchema: ZodType<T>;
  status?: number;
  operation: (tx: Prisma.TransactionClient) => Promise<unknown>;
}

interface StoredResponse {
  body: string;
  status: number;
  replayed: boolean;
}

class ResponseContractError extends Error {}
class IdempotencyPayloadConflict extends Error {}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function storedResponse(body: string, status: number, replayed: boolean): NextResponse {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(replayed ? { "Idempotency-Replayed": "true" } : {}),
    },
  });
}

export async function replayIdempotentMutation(
  request: Request,
  actorId: string,
  payload: unknown
): Promise<NextResponse | null> {
  const rawKey = request.headers.get("idempotency-key");
  if (rawKey === null) return null;
  if (!IDEMPOTENCY_KEY_PATTERN.test(rawKey)) {
    return apiError(
      request,
      422,
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency-Key 必須為 1–128 個可見 ASCII 字元"
    );
  }

  const keyHash = sha256(rawKey);
  const requestHash = sha256(stableJson(payload));
  const method = request.method.toUpperCase();
  const requestPath = new URL(request.url).pathname;
  const existing = await prisma.idempotencyRecord.findUnique({
    where: {
      actorId_method_requestPath_keyHash: { actorId, method, requestPath, keyHash },
    },
  });
  if (!existing || existing.expiresAt <= new Date()) return null;
  if (existing.requestHash !== requestHash) {
    return apiError(request, 409, "IDEMPOTENCY_CONFLICT", "相同 Idempotency-Key 不可搭配不同請求內容");
  }
  return storedResponse(existing.responseBody, existing.statusCode, true);
}

export async function executeIdempotentMutation<T>(
  options: IdempotentMutationOptions<T>
): Promise<NextResponse> {
  const { request, actorId, payload, responseSchema, operation } = options;
  const responseStatus = options.status ?? 201;
  const rawKey = request.headers.get("idempotency-key");

  if (rawKey !== null && !IDEMPOTENCY_KEY_PATTERN.test(rawKey)) {
    return apiError(
      request,
      422,
      "INVALID_IDEMPOTENCY_KEY",
      "Idempotency-Key 必須為 1–128 個可見 ASCII 字元"
    );
  }

  const keyHash = rawKey ? sha256(rawKey) : null;
  const requestHash = sha256(stableJson(payload));
  const method = request.method.toUpperCase();
  const requestPath = new URL(request.url).pathname;
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

  const run = async (): Promise<StoredResponse> => prisma.$transaction(async (tx) => {
    if (keyHash) {
      const now = new Date();
      await tx.idempotencyRecord.deleteMany({ where: { expiresAt: { lte: now } } });
      const existing = await tx.idempotencyRecord.findUnique({
        where: {
          actorId_method_requestPath_keyHash: { actorId, method, requestPath, keyHash },
        },
      });
      if (existing) {
        if (existing.requestHash !== requestHash) throw new IdempotencyPayloadConflict();
        return { body: existing.responseBody, status: existing.statusCode, replayed: true };
      }
      await tx.idempotencyRecord.create({
        data: {
          actorId,
          method,
          requestPath,
          keyHash,
          requestHash,
          statusCode: responseStatus,
          responseBody: "",
          expiresAt,
        },
      });
    }

    const result = await operation(tx);
    const parsed = responseSchema.safeParse(result);
    if (!parsed.success) {
      console.error("Idempotent mutation response contract violation:", parsed.error.issues);
      throw new ResponseContractError();
    }
    const body = JSON.stringify(parsed.data);

    if (keyHash) {
      await tx.idempotencyRecord.update({
        where: {
          actorId_method_requestPath_keyHash: { actorId, method, requestPath, keyHash },
        },
        data: { responseBody: body },
      });
    }
    return { body, status: responseStatus, replayed: false };
  }, { maxWait: 30_000, timeout: 30_000 });

  try {
    const result = await serializeSqliteWrite(run);
    return storedResponse(result.body, result.status, result.replayed);
  } catch (error) {
    if (error instanceof ResponseContractError) {
      return apiError(request, 500, "INVALID_RESPONSE", "伺服器回應格式驗證失敗");
    }
    if (error instanceof IdempotencyPayloadConflict) {
      return apiError(request, 409, "IDEMPOTENCY_CONFLICT", "相同 Idempotency-Key 不可搭配不同請求內容");
    }
    if (keyHash && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: {
          actorId_method_requestPath_keyHash: { actorId, method, requestPath, keyHash },
        },
      });
      if (existing && existing.expiresAt > new Date()) {
        if (existing.requestHash !== requestHash) {
          return apiError(request, 409, "IDEMPOTENCY_CONFLICT", "相同 Idempotency-Key 不可搭配不同請求內容");
        }
        return storedResponse(existing.responseBody, existing.statusCode, true);
      }
    }
    throw error;
  }
}
