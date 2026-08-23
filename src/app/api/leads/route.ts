import { prisma } from "@/lib/prisma";
import { asDataRegion, getLeadScopeFilter, isGMOrAdmin, isSalesManager, nestedUserSelect } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { apiError, apiErrorFromUnknown, paginatedArrayResponse, parseJsonBody, parseQuery } from "@/lib/api-response";
import { leadMutationSchema, regionalListQuerySchema } from "@/lib/contracts";
import { leadConversionResponseSchema, leadListItemResponseSchema, leadResponseSchema } from "@/lib/response-contracts";
import { executeIdempotentMutation, replayIdempotentMutation } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("leads", "read", request);
    if (!authorization.ok) return authorization.response;
    const user = authorization.user;
    const query = parseQuery(request, regionalListQuerySchema);
    if (!query.ok) return query.response;
    const { region: queryRegion, cursor, limit } = query.data;

    const leadWhere = getLeadScopeFilter(user, queryRegion);

    const leads = await prisma.lead.findMany({
      where: leadWhere,
      include: {
        assignedTo: { select: nestedUserSelect },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return paginatedArrayResponse(request, leads, limit, leadListItemResponseSchema);
  } catch (error) {
    console.error("Leads GET Error:", error);
    return apiErrorFromUnknown(request, error, "LEADS_READ_FAILED", "無法取得線索資料");
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requirePermission("leads", "create", request);
    if (!authorization.ok) return authorization.response;
    const user = authorization.user;
    const parsed = await parseJsonBody(request, leadMutationSchema);
    if (!parsed.ok) return parsed.response;
    const replay = await replayIdempotentMutation(request, user.id, parsed.data);
    if (replay) return replay;
    const body = parsed.data;
    const { action } = body;

    // Handle Lead Conversion
    if (action === "CONVERT") {
      const { leadId, dealTitle, dealValue } = body;

      const lead = await prisma.lead.findFirst({
        where: { id: leadId, ...getLeadScopeFilter(user) },
      });

      if (!lead) {
        return apiError(request, 404, "LEAD_NOT_FOUND", "找不到指定的線索");
      }

      return executeIdempotentMutation({
        request,
        actorId: user.id,
        payload: parsed.data,
        responseSchema: leadConversionResponseSchema,
        status: 200,
        operation: async (tx) => {
          let account = null;
          if (lead.company) {
            account = await tx.account.findFirst({
              where: { name: lead.company, region: lead.region },
            });
            if (!account) {
              account = await tx.account.create({
                data: { name: lead.company, phone: lead.phone, region: lead.region },
              });
            }
          }

          const contact = await tx.contact.create({
            data: {
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              region: lead.region,
              accountId: account?.id,
              tags: "由線索轉換, 潛在客戶",
            },
          });

          let deal = null;
          const defaultPipeline = await tx.pipeline.findFirst({
            where: { isDefault: true },
            include: { stages: { orderBy: { order: "asc" } } },
          });
          if (defaultPipeline?.stages.length) {
            deal = await tx.deal.create({
              data: {
                title: dealTitle || `${lead.company || lead.name} - 新業務機會`,
                value: dealValue,
                region: lead.region,
                pipelineId: defaultPipeline.id,
                stageId: defaultPipeline.stages[0].id,
                contactId: contact.id,
                accountId: account?.id,
                assignedToId: lead.assignedToId || user.id,
                notes: lead.notes,
              },
            });
          }

          await tx.lead.update({ where: { id: lead.id }, data: { status: "CONVERTED" } });
          await tx.activity.create({
            data: {
              type: "STAGE_CHANGE",
              title: `線索「${lead.name}」已成功轉換為正式聯絡人與商機`,
              contactId: contact.id,
              accountId: account?.id,
              dealId: deal?.id,
              userId: user.id,
            },
          });
          await recordAuditEvent({
            request,
            actor: user,
            action: "convert",
            resource: "leads",
            resourceId: lead.id,
            result: "SUCCESS",
            details: { contactId: contact.id, dealId: deal?.id || null },
          }, tx);
          return { success: true as const, contact, account, deal };
        },
      });
    }

    // Normal Lead Creation
    const { name, email, phone, company, source, score, region, notes, assignedToId } = body;
    const effectiveRegion = asDataRegion(isGMOrAdmin(user) ? (region || "NORTH") : user.region);
    if (!effectiveRegion) {
      return apiError(request, 422, "INVALID_ROLE_REGION", "目前使用者必須指派特定區域");
    }
    let effectiveAssignedToId = user.id;
    if (assignedToId && (isGMOrAdmin(user) || isSalesManager(user))) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: assignedToId,
          isActive: true,
          ...(isSalesManager(user) ? { region: user.region } : {}),
        },
        select: { id: true },
      });
      if (!assignee) {
        return apiError(request, 400, "INVALID_ASSIGNEE", "指定的負責人不存在或不在可管理範圍");
      }
      effectiveAssignedToId = assignee.id;
    }

    return executeIdempotentMutation({
      request,
      actorId: user.id,
      payload: parsed.data,
      responseSchema: leadResponseSchema,
      operation: async (tx) => {
        const createdLead = await tx.lead.create({
          data: {
            name,
            email: email || null,
            phone,
            company,
            region: effectiveRegion,
            source: source || "Website",
            score: score ?? 50,
            notes,
            assignedToId: effectiveAssignedToId,
          },
        });
        await recordAuditEvent({
          request,
          actor: user,
          action: "create",
          resource: "leads",
          resourceId: createdLead.id,
          result: "SUCCESS",
        }, tx);
        return createdLead;
      },
    });
  } catch (error) {
    console.error("Leads POST Error:", error);
    return apiErrorFromUnknown(request, error, "LEAD_MUTATION_FAILED", "無法處理線索資料");
  }
}
