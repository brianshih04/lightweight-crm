import "server-only";

import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "./auth";
import { hasPermission, type PermissionAction, type PermissionResource } from "./permissions";
import { requireSameOrigin } from "./csrf";
import { recordAuditEvent } from "./audit";
import { apiError } from "./api-response";

export { hasPermission, permissionMatrix } from "./permissions";
export type { PermissionAction, PermissionResource } from "./permissions";

export type PermissionResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

export async function requirePermission(
  resource: PermissionResource,
  action: PermissionAction,
  request: Request
): Promise<PermissionResult> {
  const user = await getCurrentUser();
  if (!user) {
    await recordAuditEvent({
      request,
      action,
      resource,
      result: "DENIED",
      details: { reason: "UNAUTHENTICATED" },
    });
    return {
      ok: false,
      response: apiError(request, 401, "UNAUTHENTICATED", "請先登入"),
    };
  }
  if (!hasPermission(user, resource, action)) {
    await recordAuditEvent({
      request,
      actor: user,
      action,
      resource,
      result: "DENIED",
      details: { reason: "FORBIDDEN" },
    });
    return {
      ok: false,
      response: apiError(request, 403, "FORBIDDEN", "權限不足"),
    };
  }
  if (action !== "read") {
    const csrfError = requireSameOrigin(request);
    if (csrfError) {
      await recordAuditEvent({
        request,
        actor: user,
        action,
        resource,
        result: "DENIED",
        details: { reason: "INVALID_CSRF_ORIGIN" },
      });
      return { ok: false, response: csrfError };
    }
  }
  return { ok: true, user };
}
