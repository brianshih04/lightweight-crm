import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { apiError, apiErrorFromUnknown, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { userUpdateSchema } from "@/lib/contracts";
import { successResponseSchema, userResponseSchema } from "@/lib/response-contracts";
import { inspectManagerHierarchy, MAX_MANAGER_HIERARCHY_DEPTH } from "@/lib/user-hierarchy";
import { canManageUserRole, roleRequiresRegionalScope } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = await requirePermission("users", "update", request);
    if (!authorization.ok) return authorization.response;

    const parsed = await parseJsonBody(request, userUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const { name, email, role, department, region, title, managerId, password } = parsed.data;

    if (id === "initial-admin" && ((role && role !== "ADMIN") || (region && region !== "ALL"))) {
      return apiError(request, 422, "INITIAL_ADMIN_PROTECTED", "首位系統管理員必須保留 ADMIN 與 ALL 權限");
    }

    const updateData: Prisma.UserUncheckedUpdateInput = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (department) updateData.department = department;
    if (region) updateData.region = region;
    if (title) updateData.title = title;
    if (managerId !== undefined) updateData.managerId = managerId || null;
    if (password) {
      updateData.password = await hashPassword(password);
      // 管理者重設密碼後，使用者需再次於登入時自行更改
      updateData.mustChangePassword = true;
    }

    const target = await prisma.user.findFirst({
      where: { id, isActive: true },
      select: { id: true, role: true, region: true, managerId: true },
    });
    if (!target) return apiError(request, 404, "USER_NOT_FOUND", "找不到指定使用者");
    const effectiveRole = role || target.role;
    const effectiveRegion = region || target.region;
    if (roleRequiresRegionalScope(effectiveRole) && effectiveRegion === "ALL") {
      return apiError(request, 422, "INVALID_ROLE_REGION", "業務角色必須指派特定區域");
    }
    if (effectiveRole === "MARKETING_MANAGER" && effectiveRegion !== "ALL") {
      return apiError(request, 422, "INVALID_ROLE_REGION", "市場部主管必須指派全區總部範圍");
    }
    const effectiveManagerId = managerId !== undefined ? managerId : target.managerId;
    if (effectiveManagerId === id) return apiError(request, 422, "SELF_MANAGER", "使用者不可成為自己的主管");
    if (effectiveManagerId) {
      const manager = await prisma.user.findFirst({
        where: {
          id: effectiveManagerId,
          isActive: true,
          role: { in: ["ADMIN", "GM", "MARKETING_MANAGER", "SALES_MANAGER"] },
          region: { in: ["ALL", effectiveRegion] },
        },
        select: { id: true, role: true },
      });
      if (!manager) return apiError(request, 422, "INVALID_MANAGER", "指定主管不存在、角色不符或不在相同區域");
      if (!canManageUserRole(manager.role, effectiveRole)) {
        return apiError(request, 422, "INVALID_MANAGER_ROLE", "指定主管與成員角色不符合組織階層");
      }

      const hierarchyViolation = await inspectManagerHierarchy({
        targetUserId: id,
        managerId: effectiveManagerId,
        loadParentId: async (userId) => {
          const ancestor = await prisma.user.findFirst({
            where: { id: userId, isActive: true },
            select: { managerId: true },
          });
          return ancestor?.managerId || null;
        },
      });
      if (hierarchyViolation === "cycle") {
        return apiError(request, 422, "MANAGER_CYCLE", "主管階層不可形成循環");
      }
      if (hierarchyViolation === "too_deep") {
        return apiError(
          request,
          422,
          "MANAGER_HIERARCHY_TOO_DEEP",
          `主管階層不可超過 ${MAX_MANAGER_HIERARCHY_DEPTH} 層`
        );
      }
    }

    const subordinateCount = await prisma.user.count({ where: { managerId: id, isActive: true } });
    if (subordinateCount > 0 && !["ADMIN", "GM", "MARKETING_MANAGER", "SALES_MANAGER"].includes(effectiveRole)) {
      return apiError(request, 422, "MANAGER_HAS_SUBORDINATES", "請先重新指派下屬，再移除主管角色");
    }
    if (subordinateCount > 0 && effectiveRegion !== "ALL") {
      const outOfRegionSubordinates = await prisma.user.count({
        where: { managerId: id, isActive: true, region: { not: effectiveRegion } },
      });
      if (outOfRegionSubordinates > 0) {
        return apiError(request, 422, "SUBORDINATE_REGION_MISMATCH", "主管與所有下屬必須位於相同區域");
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
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
      if (password) {
        await tx.authSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await recordAuditEvent({
        request,
        actor: authorization.user,
        action: "update",
        resource: "users",
        resourceId: updatedUser.id,
        result: "SUCCESS",
        details: { passwordReset: Boolean(password), role: updatedUser.role, region: updatedUser.region },
      }, tx);
      return updatedUser;
    });

    return apiSuccess(request, userResponseSchema, user);
  } catch (error) {
    console.error("User PATCH Error:", error);
    return apiErrorFromUnknown(request, error, "USER_UPDATE_FAILED", "更新人員資料失敗");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = await requirePermission("users", "delete", request);
    if (!authorization.ok) return authorization.response;

    // Protect main admin
    const targetUser = await prisma.user.findFirst({
      where: { id, isActive: true },
    });

    if (!targetUser) {
      return apiError(request, 404, "USER_NOT_FOUND", "找不到指定使用者");
    }

    if (targetUser?.id === "initial-admin" || targetUser?.role === "GM") {
      return apiError(request, 422, "PROTECTED_USER", "系統保護：無法刪除首位管理員或總經理帳號");
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date(), managerId: null },
      });
      await tx.user.updateMany({
        where: { managerId: id, isActive: true },
        data: { managerId: null },
      });
      await tx.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await recordAuditEvent({
        request,
        actor: authorization.user,
        action: "delete",
        resource: "users",
        resourceId: id,
        result: "SUCCESS",
        details: { username: targetUser?.username || null },
      }, tx);
    });

    return apiSuccess(request, successResponseSchema, { success: true });
  } catch (error) {
    console.error("User DELETE Error:", error);
    return apiErrorFromUnknown(request, error, "USER_DELETE_FAILED", "刪除人員失敗");
  }
}
