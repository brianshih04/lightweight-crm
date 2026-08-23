import { getCurrentUser, revokeAllUserSessions, revokeCurrentSession } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/csrf";
import { recordAuditEvent } from "@/lib/audit";
import { apiErrorFromUnknown, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { logoutSchema } from "@/lib/contracts";
import { successResponseSchema } from "@/lib/response-contracts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) {
      await recordAuditEvent({
        request,
        action: "logout",
        resource: "auth",
        result: "DENIED",
        details: { reason: "INVALID_CSRF_ORIGIN" },
      });
      return csrfError;
    }

    let allDevices = false;
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (request.headers.get("content-type") || contentLength > 0) {
      const parsed = await parseJsonBody(request, logoutSchema);
      if (!parsed.ok) return parsed.response;
      allDevices = parsed.data.allDevices === true;
    }

    const user = await getCurrentUser();
    const response = apiSuccess(request, successResponseSchema, { success: true });
    if (allDevices && user) {
      await revokeAllUserSessions(user.id);
    }
    await revokeCurrentSession(response);
    await recordAuditEvent({
      request,
      actor: user,
      action: "logout",
      resource: "auth",
      resourceId: user?.id || null,
      result: "SUCCESS",
      details: { allDevices },
    });
    return response;
  } catch (error) {
    console.error("Logout API Error:", error);
    return apiErrorFromUnknown(request, error, "LOGOUT_FAILED", "登出失敗，請稍後再試");
  }
}
