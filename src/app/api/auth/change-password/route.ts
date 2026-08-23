import { getCurrentUser, revokeOtherUserSessions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { hashPassword } from "@/lib/password";
import { requireSameOrigin } from "@/lib/csrf";
import { recordAuditEvent } from "@/lib/audit";
import { apiError, apiErrorFromUnknown, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { passwordChangeSchema } from "@/lib/contracts";
import { successResponseSchema } from "@/lib/response-contracts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) {
      await recordAuditEvent({
        request,
        action: "update",
        resource: "auth",
        result: "DENIED",
        details: { reason: "INVALID_CSRF_ORIGIN" },
      });
      return csrfError;
    }

    const parsed = await parseJsonBody(request, passwordChangeSchema);
    if (!parsed.ok) return parsed.response;
    const { currentPassword, newPassword } = parsed.data;

    const user = await getCurrentUser();
    if (!user) {
      return apiError(request, 401, "UNAUTHENTICATED", "請先登入");
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true, isActive: true },
    });
    if (!dbUser || !dbUser.isActive) {
      return apiError(request, 401, "UNAUTHENTICATED", "帳號不存在或已停用");
    }

    const currentValid = await verifyPassword(currentPassword, dbUser.password);
    if (!currentValid) {
      await recordAuditEvent({
        request,
        actor: user,
        action: "update",
        resource: "auth",
        resourceId: user.id,
        result: "DENIED",
        details: { reason: "INVALID_CURRENT_PASSWORD" },
      });
      return apiError(request, 401, "INVALID_CURRENT_PASSWORD", "目前密碼不正確");
    }

    const sameAsCurrent = await verifyPassword(newPassword, dbUser.password);
    if (sameAsCurrent) {
      return apiError(request, 422, "PASSWORD_UNCHANGED", "新密碼不可與目前密碼相同");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(newPassword),
        mustChangePassword: false,
      },
    });

    // 更改密碼後撤銷其他裝置的 Session；目前裝置保持登入
    await revokeOtherUserSessions(user.id);

    await recordAuditEvent({
      request,
      actor: user,
      action: "update",
      resource: "auth",
      resourceId: user.id,
      result: "SUCCESS",
      details: { reason: "SELF_PASSWORD_CHANGE" },
    });

    return apiSuccess(request, successResponseSchema, { success: true });
  } catch (error) {
    console.error("Change password API Error:", error);
    return apiErrorFromUnknown(request, error, "CHANGE_PASSWORD_FAILED", "更改密碼失敗，請稍後再試");
  }
}
