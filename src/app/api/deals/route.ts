import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asDataRegion, getDealScopeFilter, getEntityScopeFilter, isGMOrAdmin, isSalesManager, publicUserSelect } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { apiError, apiErrorFromUnknown, apiSuccess, parseJsonBody, parseQuery } from "@/lib/api-response";
import { dealCreateSchema, dealUpdateSchema, regionalListQuerySchema } from "@/lib/contracts";
import { dealsOverviewResponseSchema, dealUpdateResponseSchema, dealWithRelationsResponseSchema } from "@/lib/response-contracts";
import { executeIdempotentMutation, replayIdempotentMutation } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("deals", "read", request);
    if (!authorization.ok) return authorization.response;
    const user = authorization.user;
    const query = parseQuery(request, regionalListQuerySchema);
    if (!query.ok) return query.response;
    const { region: queryRegion, cursor, limit } = query.data;

    const dealWhere = getDealScopeFilter(user, queryRegion);

    const pipelines = await prisma.pipeline.findMany({
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
      },
    });

    const deals = await prisma.deal.findMany({
      where: dealWhere,
      include: {
        stage: true,
        contact: true,
        account: true,
        assignedTo: { select: publicUserSelect },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = deals.length > limit;
    const page = deals.slice(0, limit);
    const dealByStage = new Map<string, typeof page>();
    for (const deal of page) {
      const stageDeals = dealByStage.get(deal.stageId) || [];
      stageDeals.push(deal);
      dealByStage.set(deal.stageId, stageDeals);
    }
    const pipelinesWithDeals = pipelines.map((pipeline) => ({
      ...pipeline,
      stages: pipeline.stages.map((stage) => ({
        ...stage,
        deals: dealByStage.get(stage.id) || [],
      })),
    }));

    const defaultPipeline = pipelinesWithDeals.find((pipeline) => pipeline.isDefault) || pipelinesWithDeals[0];

    return apiSuccess(
      request,
      dealsOverviewResponseSchema,
      {
        currentUser: user,
        isGMOrAdmin: isGMOrAdmin(user),
        pipelines: pipelinesWithDeals,
        activePipeline: defaultPipeline,
      },
      {
        headers: {
          "X-Page-Size": String(page.length),
          ...(hasMore && page.length ? { "X-Next-Cursor": page.at(-1)!.id } : {}),
        },
      }
    );
  } catch (error) {
    console.error("Deals GET Error:", error);
    return apiErrorFromUnknown(request, error, "DEALS_READ_FAILED", "無法取得商機與管線資料");
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requirePermission("deals", "create", request);
    if (!authorization.ok) return authorization.response;
    const user = authorization.user;
    const parsed = await parseJsonBody(request, dealCreateSchema);
    if (!parsed.ok) return parsed.response;
    const replay = await replayIdempotentMutation(request, user.id, parsed.data);
    if (replay) return replay;
    const { title, value, pipelineId, stageId, contactId, accountId, assignedToId, region, expectedCloseDate, notes } = parsed.data;

    const [stage, contact, account] = await Promise.all([
      prisma.stage.findFirst({ where: { id: stageId, pipelineId }, select: { id: true } }),
      contactId
        ? prisma.contact.findFirst({
            where: { id: contactId, ...getEntityScopeFilter(user) },
            select: { id: true, region: true, accountId: true },
          })
        : null,
      accountId
        ? prisma.account.findFirst({
            where: { id: accountId, ...getEntityScopeFilter(user) },
            select: { id: true, region: true },
          })
        : null,
    ]);
    if (!stage) return apiError(request, 400, "INVALID_STAGE", "指定的階段不屬於此管線");
    if (contactId && !contact) return apiError(request, 400, "INVALID_CONTACT_SCOPE", "指定的聯絡人不存在或不在可存取範圍");
    if (accountId && !account) return apiError(request, 400, "INVALID_ACCOUNT_SCOPE", "指定的企業客戶不存在或不在可存取範圍");
    if (contact?.accountId && accountId && contact.accountId !== accountId) {
      return apiError(request, 400, "CONTACT_ACCOUNT_MISMATCH", "聯絡人不屬於指定的企業客戶");
    }

    // Default region to user's region if not specified or not GM
    const effectiveRegion = asDataRegion(isGMOrAdmin(user)
      ? (region || contact?.region || account?.region || "NORTH")
      : user.region);
    if (!effectiveRegion) {
      return apiError(request, 422, "INVALID_ROLE_REGION", "目前使用者必須指派特定區域");
    }
    if ((contact && contact.region !== effectiveRegion) || (account && account.region !== effectiveRegion)) {
      return apiError(request, 400, "REGION_MISMATCH", "商機、聯絡人與企業客戶必須位於相同區域");
    }
    let effectiveAssignedToId = user.id;
    if (assignedToId && (isGMOrAdmin(user) || isSalesManager(user))) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: assignedToId,
          isActive: true,
          ...(isSalesManager(user) ? { region: user.region } : {}),
        },
        select: { id: true, region: true },
      });
      if (!assignee || (assignee.region !== "ALL" && assignee.region !== effectiveRegion)) {
        return apiError(request, 400, "INVALID_ASSIGNEE", "指定的負責人不存在或不在可管理範圍");
      }
      effectiveAssignedToId = assignee.id;
    }

    return executeIdempotentMutation({
      request,
      actorId: user.id,
      payload: parsed.data,
      responseSchema: dealWithRelationsResponseSchema,
      operation: async (tx) => {
        const createdDeal = await tx.deal.create({
          data: {
            title,
            value,
            region: effectiveRegion,
            pipelineId,
            stageId,
            contactId: contactId || null,
            accountId: accountId || contact?.accountId || null,
            assignedToId: effectiveAssignedToId,
            expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
            notes,
          },
          include: {
            stage: true,
            contact: true,
            account: true,
            assignedTo: { select: publicUserSelect },
          },
        });
        await tx.activity.create({
          data: {
            type: "NOTE",
            title: `建立了新商機「${title}」(${createdDeal.region} 區)`,
            content: `金額：${createdDeal.value} 元，由 ${user.name} 建立`,
            contactId: createdDeal.contactId,
            accountId: createdDeal.accountId,
            dealId: createdDeal.id,
            userId: user.id,
          },
        });
        await recordAuditEvent({
          request,
          actor: user,
          action: "create",
          resource: "deals",
          resourceId: createdDeal.id,
          result: "SUCCESS",
        }, tx);
        return createdDeal;
      },
    });
  } catch (error) {
    console.error("Deals POST Error:", error);
    return apiErrorFromUnknown(request, error, "DEAL_CREATE_FAILED", "無法建立商機");
  }
}

export async function PATCH(request: Request) {
  try {
    const authorization = await requirePermission("deals", "update", request);
    if (!authorization.ok) return authorization.response;
    const parsed = await parseJsonBody(request, dealUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const { dealId, stageId, status } = parsed.data;

    const existingDeal = await prisma.deal.findFirst({
      where: { id: dealId, ...getDealScopeFilter(authorization.user) },
      select: { id: true, pipelineId: true },
    });
    if (!existingDeal) {
      return apiError(request, 404, "DEAL_NOT_FOUND", "找不到商機或無權操作");
    }

    if (stageId) {
      const stage = await prisma.stage.findFirst({
        where: { id: stageId, pipelineId: existingDeal.pipelineId },
        select: { id: true },
      });
      if (!stage) {
        return apiError(request, 400, "INVALID_STAGE", "指定階段不屬於此商機管線");
      }
    }

    const updateData: Prisma.DealUncheckedUpdateInput = {};
    if (stageId) updateData.stageId = stageId;
    if (status) updateData.status = status;

    const deal = await prisma.$transaction(async (tx) => {
      const updatedDeal = await tx.deal.update({
        where: { id: dealId },
        data: updateData,
        include: { stage: true, contact: true },
      });
      if (stageId) {
        await tx.activity.create({
          data: {
            type: "STAGE_CHANGE",
            title: `商機階段變更為「${updatedDeal.stage.name}」`,
            contactId: updatedDeal.contactId,
            dealId: updatedDeal.id,
            userId: authorization.user.id,
          },
        });
      }
      await recordAuditEvent({
        request,
        actor: authorization.user,
        action: "update",
        resource: "deals",
        resourceId: updatedDeal.id,
        result: "SUCCESS",
        details: { stageChanged: Boolean(stageId), statusChanged: Boolean(status) },
      }, tx);
      return updatedDeal;
    });

    return apiSuccess(request, dealUpdateResponseSchema, deal);
  } catch (error) {
    console.error("Deals PATCH Error:", error);
    return apiErrorFromUnknown(request, error, "DEAL_UPDATE_FAILED", "無法更新商機");
  }
}
