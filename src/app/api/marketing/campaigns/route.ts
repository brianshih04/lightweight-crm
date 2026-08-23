import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { apiErrorFromUnknown, apiSuccess, parseJsonBody, parseQuery } from "@/lib/api-response";
import { campaignCreateSchema, paginationQuerySchema } from "@/lib/contracts";
import { campaignsOverviewResponseSchema, campaignWithRelationsResponseSchema } from "@/lib/response-contracts";
import { executeIdempotentMutation, replayIdempotentMutation } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("campaigns", "read", request);
    if (!authorization.ok) return authorization.response;
    const query = parseQuery(request, paginationQuerySchema);
    if (!query.ok) return query.response;
    const { cursor, limit } = query.data;
    const [campaigns, segments, templates] = await Promise.all([
      prisma.campaign.findMany({
        include: {
          segment: true,
          template: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.segment.findMany({
        orderBy: { name: "asc" },
        take: 101,
      }),
      prisma.emailTemplate.findMany({
        orderBy: { name: "asc" },
        take: 101,
      }),
    ]);

    const hasMore = campaigns.length > limit;
    const page = campaigns.slice(0, limit);
    const referenceDataTruncated = segments.length > 100 || templates.length > 100;
    return apiSuccess(
      request,
      campaignsOverviewResponseSchema,
      { campaigns: page, segments: segments.slice(0, 100), templates: templates.slice(0, 100) },
      {
        headers: {
          "X-Page-Size": String(page.length),
          ...(hasMore && page.length ? { "X-Next-Cursor": page.at(-1)!.id } : {}),
          ...(referenceDataTruncated ? { "X-Reference-Data-Truncated": "true" } : {}),
        },
      }
    );
  } catch (error) {
    console.error("Campaigns GET Error:", error);
    return apiErrorFromUnknown(request, error, "CAMPAIGNS_READ_FAILED", "無法取得行銷活動");
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requirePermission("campaigns", "create", request);
    if (!authorization.ok) return authorization.response;
    const parsed = await parseJsonBody(request, campaignCreateSchema);
    if (!parsed.ok) return parsed.response;
    const replay = await replayIdempotentMutation(request, authorization.user.id, parsed.data);
    if (replay) return replay;
    const { name, channel, segmentId, templateId, subject, scheduledAt } = parsed.data;

    return executeIdempotentMutation({
      request,
      actorId: authorization.user.id,
      payload: parsed.data,
      responseSchema: campaignWithRelationsResponseSchema,
      operation: async (tx) => {
        const createdCampaign = await tx.campaign.create({
          data: {
            name,
            channel: channel || "EMAIL",
            segmentId: segmentId || null,
            templateId: templateId || null,
            subject,
            status: scheduledAt ? "SCHEDULED" : "DRAFT",
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          },
          include: { segment: true, template: true },
        });
        await recordAuditEvent({
          request,
          actor: authorization.user,
          action: "create",
          resource: "campaigns",
          resourceId: createdCampaign.id,
          result: "SUCCESS",
        }, tx);
        return createdCampaign;
      },
    });
  } catch (error) {
    console.error("Campaigns POST Error:", error);
    return apiErrorFromUnknown(request, error, "CAMPAIGN_CREATE_FAILED", "無法建立行銷活動");
  }
}
