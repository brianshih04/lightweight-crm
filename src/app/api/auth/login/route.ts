import { prisma } from "@/lib/prisma";
import { createAuthSession, sessionUserFromDatabase } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/csrf";
import {
  clearLoginIdentityThrottle,
  getLoginThrottle,
  recordLoginFailure,
} from "@/lib/login-throttle";
import { hashPassword, passwordNeedsUpgrade, verifyPassword } from "@/lib/password";
import { recordAuditEvent } from "@/lib/audit";
import { apiError, apiErrorFromUnknown, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { loginSchema } from "@/lib/contracts";
import { authenticatedResponseSchema } from "@/lib/response-contracts";

export const dynamic = "force-dynamic";
const dummyPasswordHash = hashPassword("constant-time-login-verification-placeholder");

function throttled(request: Request, retryAfterSeconds: number) {
  const response = apiError(
    request,
    429,
    "LOGIN_RATE_LIMITED",
    "登入嘗試過於頻繁，請稍後再試",
    undefined,
    { retryAfter: retryAfterSeconds }
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

export async function POST(request: Request) {
  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) {
      await recordAuditEvent({
        request,
        action: "login",
        resource: "auth",
        result: "DENIED",
        details: { reason: "INVALID_CSRF_ORIGIN" },
      });
      return csrfError;
    }

    const parsed = await parseJsonBody(request, loginSchema);
    if (!parsed.ok) return parsed.response;
    const { username, password } = parsed.data;

    const throttle = await getLoginThrottle(request, username);
    if (throttle.blocked) {
      await recordAuditEvent({
        request,
        action: "login",
        resource: "auth",
        result: "DENIED",
        details: { reason: "RATE_LIMITED" },
      });
      return throttled(request, throttle.retryAfterSeconds);
    }

    if ((await prisma.user.count()) === 0) {
      return apiError(request, 409, "INITIAL_SETUP_REQUIRED", "請先建立第一位系統管理員");
    }

    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [{ username: username }, { email: username }],
      },
    });

    const passwordMatches = await verifyPassword(password, user?.password || await dummyPasswordHash);
    if (!user || !passwordMatches) {
      const failed = await recordLoginFailure(request, username);
      await recordAuditEvent({
        request,
        action: "login",
        resource: "auth",
        result: "DENIED",
        details: { reason: failed.blocked ? "RATE_LIMITED" : "INVALID_CREDENTIALS" },
      });
      if (failed.blocked) return throttled(request, failed.retryAfterSeconds);
      return apiError(request, 401, "INVALID_CREDENTIALS", "帳號或密碼錯誤");
    }

    await clearLoginIdentityThrottle(username);

    if (passwordNeedsUpgrade(user.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(password) },
      });
    }

    const sessionUser = sessionUserFromDatabase(user);
    if (!sessionUser) {
      return apiError(request, 500, "INVALID_USER_STATE", "使用者角色或區域資料無效");
    }

    const response = apiSuccess(request, authenticatedResponseSchema, { success: true, user: sessionUser });
    await createAuthSession(response, user.id);
    await recordAuditEvent({
      request,
      actor: sessionUser,
      action: "login",
      resource: "auth",
      resourceId: user.id,
      result: "SUCCESS",
      details: { passwordUpgraded: passwordNeedsUpgrade(user.password) },
    });

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return apiErrorFromUnknown(request, error, "LOGIN_FAILED", "登入失敗，請稍後再試");
  }
}
