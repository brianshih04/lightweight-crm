import "server-only";

import { NextResponse } from "next/server";
import { apiError } from "./api-response";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function expectedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();
  const configured = process.env.APP_ORIGIN;
  if (configured) {
    for (const value of configured.split(",")) {
      const origin = normalizeOrigin(value.trim());
      if (origin) origins.add(origin);
    }
    if (origins.size > 0) return origins;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  if (host) {
    const protocol = forwardedProto
      ? `${forwardedProto.replace(/:$/, "")}:`
      : new URL(request.url).protocol;
    const origin = normalizeOrigin(`${protocol}//${host}`);
    if (origin) origins.add(origin);
  }
  origins.add(new URL(request.url).origin);
  return origins;
}

export function requireSameOrigin(request: Request): NextResponse | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null;

  const origin = request.headers.get("origin");
  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;
  if (!normalizedOrigin || !expectedOrigins(request).has(normalizedOrigin)) {
    return apiError(request, 403, "INVALID_CSRF_ORIGIN", "請求來源驗證失敗");
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return apiError(request, 403, "INVALID_CSRF_ORIGIN", "請求來源驗證失敗");
  }

  return null;
}
