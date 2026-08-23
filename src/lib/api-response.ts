import "server-only";

import type { ZodType } from "zod";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requestIdFor } from "./audit";

const MAX_JSON_BODY_BYTES = 64 * 1024;

export interface ApiIssue {
  path: string;
  message: string;
  code: string;
}

export function apiError(
  request: Request,
  status: number,
  code: string,
  message: string,
  issues?: ApiIssue[],
  extra?: Record<string, string | number | boolean | null>
) {
  return NextResponse.json(
    {
      error: message,
      code,
      requestId: requestIdFor(request),
      ...(issues?.length ? { issues } : {}),
      ...extra,
    },
    { status }
  );
}

export function apiErrorFromUnknown(
  request: Request,
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string
) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return apiError(request, 409, "RESOURCE_CONFLICT", "資料與現有唯一值衝突");
    }
    if (error.code === "P2025") {
      return apiError(request, 404, "RESOURCE_NOT_FOUND", "找不到指定資料");
    }
    if (error.code === "P2003") {
      return apiError(request, 409, "RELATION_CONFLICT", "資料仍被其他紀錄參照");
    }
  }
  return apiError(request, 500, fallbackCode, fallbackMessage);
}

export function apiSuccess<T>(
  request: Request,
  schema: ZodType<T>,
  data: unknown,
  init?: ResponseInit
) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error("API response contract violation:", parsed.error.issues);
    return apiError(request, 500, "INVALID_RESPONSE", "伺服器回應格式驗證失敗");
  }
  return NextResponse.json(parsed.data, init);
}

export type ParsedBody<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<ParsedBody<T>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return {
      ok: false,
      response: apiError(request, 415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type 必須為 application/json"),
    };
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    return {
      ok: false,
      response: apiError(request, 413, "PAYLOAD_TOO_LARGE", "JSON request body 不可超過 64 KiB"),
    };
  }

  let value: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > MAX_JSON_BODY_BYTES) {
      return {
        ok: false,
        response: apiError(request, 413, "PAYLOAD_TOO_LARGE", "JSON request body 不可超過 64 KiB"),
      };
    }
    value = JSON.parse(text);
  } catch {
    return {
      ok: false,
      response: apiError(request, 400, "INVALID_JSON", "JSON request body 格式錯誤"),
    };
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiError(
        request,
        422,
        "VALIDATION_ERROR",
        "請求欄位驗證失敗",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        }))
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export function parseQuery<T>(request: Request, schema: ZodType<T>): ParsedBody<T> {
  const values = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      response: apiError(
        request,
        422,
        "INVALID_QUERY",
        "查詢參數驗證失敗",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        }))
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export function paginatedArrayResponse<T extends { id: string }, TOutput>(
  request: Request,
  items: T[],
  limit: number,
  itemSchema: ZodType<TOutput>
) {
  const hasMore = items.length > limit;
  const page = items.slice(0, limit);
  const parsed = itemSchema.array().safeParse(page);
  if (!parsed.success) {
    console.error("Paginated API response contract violation:", parsed.error.issues);
    return apiError(request, 500, "INVALID_RESPONSE", "伺服器回應格式驗證失敗");
  }
  return NextResponse.json(parsed.data, {
    headers: {
      "X-Page-Size": String(parsed.data.length),
      ...(hasMore && page.length ? { "X-Next-Cursor": page.at(-1)!.id } : {}),
    },
  });
}
