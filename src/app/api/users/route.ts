import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { apiError, apiErrorFromUnknown, paginatedArrayResponse, parseJsonBody, parseQuery } from "@/lib/api-response";
import { userCreateSchema, userListQuerySchema } from "@/lib/contracts";
import { userListItemResponseSchema, userResponseSchema } from "@/lib/response-contracts";
import { executeIdempotentMutation, replayIdempotentMutation } from "@/lib/idempotency";
import { canManageUserRole, MANAGER_ROLES, roleRequiresRegionalScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("users", "read", request);
    if (!authorization.ok) return authorization.response;
    const query = parseQuery(request, userListQuerySchema);
    if (!query.ok) return query.response;
    const { cursor, limit } = query.data;

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        department: true,
        region: true,
        title: true,
        managerId: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        manager: {
          select: { id: true, name: true, title: true, region: true },
        },
        subordinates: {
          select: { id: true, name: true, title: true, region: true },
        },
        assignedDeals: {
          select: { id: true, value: true, status: true },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return paginatedArrayResponse(request, users, limit, userListItemResponseSchema);
  } catch (error) {
    console.error("Users GET API Error:", error);
    return apiErrorFromUnknown(request, error, "USERS_READ_FAILED", "無法取得使用者資料");
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requirePermission("users", "create", request);
    if (!authorization.ok) return authorization.response;

    const parsed = await parseJsonBody(request, userCreateSchema);
    if (!parsed.ok) return parsed.response;
    const replay = await replayIdempotentMutation(request, authorization.user.id, parsed.data);
    if (replay) return replay;
    const { username, password, name, email, role, department, region, title, managerId } = parsed.data;

    const effectiveRole = role || "SALES";
    const effectiveRegion = region || "NORTH";
    if (roleRequiresRegionalScope(effectiveRole) && effectiveRegion === "ALL") {
      return apiError(request, 422, "INVALID_ROLE_REGION", "業務角色必須指派特定區域");
    }
    if (effectiveRole === "MARKETING_MANAGER" && effectiveRegion !== "ALL") {
      return apiError(request, 422, "INVALID_ROLE_REGION", "市場部主管必須指派全區總部範圍");
    }
    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: {
          id: managerId,
          isActive: true,
          role: { in: [...MANAGER_ROLES] },
          region: { in: ["ALL", effectiveRegion] },
        },
        select: { id: true, role: true },
      });
      if (!manager) return apiError(request, 422, "INVALID_MANAGER", "指定主管不存在、角色不符或不在相同區域");
      if (!canManageUserRole(manager.role, effectiveRole)) {
        return apiError(request, 422, "INVALID_MANAGER_ROLE", "指定主管與成員角色不符合組織階層");
      }
    }

    const passwordHash = await hashPassword(password);
    return executeIdempotentMutation({
      request,
      actorId: authorization.user.id,
      payload: parsed.data,
      responseSchema: userResponseSchema,
      operation: async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            username,
            password: passwordHash,
            name,
            email,
            role: effectiveRole,
            department: department || "業務部",
            region: effectiveRegion,
            title: title || "業務代表",
            managerId: managerId || null,
            // 初始密碼由管理者設定：使用者首次登入必須自行更改密碼
            mustChangePassword: true,
          },
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            department: true,
            region: true,
            title: true,
            managerId: true,
            mustChangePassword: true,
            createdAt: true,
            updatedAt: true,
            manager: {
              select: { id: true, name: true, title: true, region: true },
            },
          },
        });
        await recordAuditEvent({
          request,
          actor: authorization.user,
          action: "create",
          resource: "users",
          resourceId: createdUser.id,
          result: "SUCCESS",
          details: { role: createdUser.role, region: createdUser.region },
        }, tx);
        return createdUser;
      },
    });
  } catch (error) {
    console.error("Users POST API Error:", error);
    return apiErrorFromUnknown(request, error, "USER_CREATE_FAILED", "建立人員資料失敗");
  }
}
