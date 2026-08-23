import { prisma } from "@/lib/prisma";
import { getDealScopeFilter, getEntityScopeFilter } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { apiError, apiErrorFromUnknown, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { contactActivitySchema } from "@/lib/contracts";
import { activityResponseSchema, contactDetailResponseSchema } from "@/lib/response-contracts";
import { executeIdempotentMutation, replayIdempotentMutation } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = await requirePermission("contacts", "read", request);
    if (!authorization.ok) return authorization.response;
    const contact = await prisma.contact.findFirst({
      where: { id, ...getEntityScopeFilter(authorization.user) },
      include: {
        account: true,
        _count: {
          select: {
            deals: { where: getDealScopeFilter(authorization.user) },
            tickets: true,
            activities: true,
          },
        },
      },
    });

    if (!contact) {
      return apiError(request, 404, "CONTACT_NOT_FOUND", "找不到此聯絡人");
    }

    const { _count, ...overview } = contact;
    return apiSuccess(request, contactDetailResponseSchema, {
      ...overview,
      dealCount: _count.deals,
      ticketCount: _count.tickets,
      activityCount: _count.activities,
    });
  } catch (error) {
    console.error("Contact Detail GET Error:", error);
    return apiErrorFromUnknown(request, error, "CONTACT_READ_FAILED", "無法取得聯絡人明細");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = await requirePermission("contacts", "update", request);
    if (!authorization.ok) return authorization.response;
    const parsed = await parseJsonBody(request, contactActivitySchema);
    if (!parsed.ok) return parsed.response;
    const replay = await replayIdempotentMutation(request, authorization.user.id, parsed.data);
    if (replay) return replay;
    const { type, title, content } = parsed.data;

    const contact = await prisma.contact.findFirst({
      where: { id, ...getEntityScopeFilter(authorization.user) },
    });

    if (!contact) {
      return apiError(request, 404, "CONTACT_NOT_FOUND", "找不到此聯絡人");
    }

    return executeIdempotentMutation({
      request,
      actorId: authorization.user.id,
      payload: parsed.data,
      responseSchema: activityResponseSchema,
      operation: async (tx) => {
        const createdActivity = await tx.activity.create({
          data: {
            type: type || "NOTE",
            title: title || "新增備忘記錄",
            content,
            contactId: contact.id,
            accountId: contact.accountId,
            userId: authorization.user.id,
          },
        });
        await recordAuditEvent({
          request,
          actor: authorization.user,
          action: "create_activity",
          resource: "contacts",
          resourceId: contact.id,
          result: "SUCCESS",
          details: { activityId: createdActivity.id },
        }, tx);
        return createdActivity;
      },
    });
  } catch (error) {
    console.error("Contact Activity POST Error:", error);
    return apiErrorFromUnknown(request, error, "ACTIVITY_CREATE_FAILED", "無法新增活動紀錄");
  }
}
