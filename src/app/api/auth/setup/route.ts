import { Prisma } from "@prisma/client";
import { createAuthSession, sessionUserFromDatabase } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/csrf";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { recordAuditEvent } from "@/lib/audit";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { initialSetupSchema } from "@/lib/contracts";
import { authenticatedResponseSchema, setupStateResponseSchema } from "@/lib/response-contracts";

export const dynamic = "force-dynamic";

const INITIAL_ADMIN_ID = "initial-admin";

export async function GET(request: Request) {
  const needsSetup = (await prisma.user.count()) === 0;
  return apiSuccess(
    request,
    setupStateResponseSchema,
    { needsSetup },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  try {
    const csrfError = requireSameOrigin(request);
    if (csrfError) {
      await recordAuditEvent({
        request,
        action: "bootstrap",
        resource: "auth",
        result: "DENIED",
        details: { reason: "INVALID_CSRF_ORIGIN" },
      });
      return csrfError;
    }

    const parsed = await parseJsonBody(request, initialSetupSchema);
    if (!parsed.ok) return parsed.response;
    const { username, name, email, password } = parsed.data;

    const passwordHash = await hashPassword(password);
    const admin = await prisma.$transaction(async (tx) => {
      if ((await tx.user.count()) !== 0) return null;
      return tx.user.create({
        data: {
          id: INITIAL_ADMIN_ID,
          username,
          password: passwordHash,
          name,
          email,
          role: "ADMIN",
          department: "系統管理部",
          region: "ALL",
          title: "系統管理員",
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          department: true,
          region: true,
          title: true,
          managerId: true,
        },
      });
    });

    if (!admin) {
      return apiError(request, 409, "SETUP_ALREADY_COMPLETED", "系統已完成初始化，請使用既有帳號登入");
    }

    const sessionAdmin = sessionUserFromDatabase(admin);
    if (!sessionAdmin) {
      return apiError(request, 500, "INVALID_USER_STATE", "管理員角色或區域資料無效");
    }

    const response = apiSuccess(request, authenticatedResponseSchema, { success: true, user: sessionAdmin }, { status: 201 });
    await createAuthSession(response, admin.id);
    await recordAuditEvent({
      request,
      actor: sessionAdmin,
      action: "bootstrap",
      resource: "users",
      resourceId: admin.id,
      result: "SUCCESS",
    });
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(request, 409, "SETUP_ALREADY_COMPLETED", "系統已完成初始化，請使用既有帳號登入");
    }
    console.error("Initial admin setup error:", error);
    return apiError(request, 500, "SETUP_FAILED", "初始化失敗，請稍後再試");
  }
}
