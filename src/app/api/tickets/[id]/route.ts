import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEntityScopeFilter, nestedUserSelect } from "@/lib/auth";
import { hasPermission, requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { apiError, apiErrorFromUnknown, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { ticketMessageSchema, ticketUpdateSchema } from "@/lib/contracts";
import { ticketDetailResponseSchema, ticketMessageResponseSchema, ticketWithCustomerResponseSchema } from "@/lib/response-contracts";
import { executeIdempotentMutation, replayIdempotentMutation } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = await requirePermission("tickets", "read", request);
    if (!authorization.ok) return authorization.response;
    const ticket = await prisma.ticket.findFirst({
      where: { id, ...getEntityScopeFilter(authorization.user) },
      include: {
        contact: true,
        account: true,
        assignedTo: { select: nestedUserSelect },
        messages: {
          where: hasPermission(authorization.user, "tickets", "update") ? {} : { isInternal: false },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return apiError(request, 404, "TICKET_NOT_FOUND", "找不到此工單");
    }

    return apiSuccess(request, ticketDetailResponseSchema, ticket);
  } catch (error) {
    console.error("Ticket Detail GET Error:", error);
    return apiErrorFromUnknown(request, error, "TICKET_READ_FAILED", "無法取得工單明細");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = await requirePermission("tickets", "update", request);
    if (!authorization.ok) return authorization.response;
    const parsed = await parseJsonBody(request, ticketMessageSchema);
    if (!parsed.ok) return parsed.response;
    const replay = await replayIdempotentMutation(request, authorization.user.id, parsed.data);
    if (replay) return replay;
    const { content, isInternal, senderName } = parsed.data;

    const ticket = await prisma.ticket.findFirst({
      where: { id, ...getEntityScopeFilter(authorization.user) },
    });

    if (!ticket) {
      return apiError(request, 404, "TICKET_NOT_FOUND", "找不到此工單");
    }

    return executeIdempotentMutation({
      request,
      actorId: authorization.user.id,
      payload: parsed.data,
      responseSchema: ticketMessageResponseSchema,
      operation: async (tx) => {
        const createdMessage = await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderId: authorization.user.id,
            senderName: senderName || authorization.user.name,
            senderType: "AGENT",
            isInternal: Boolean(isInternal),
            content,
          },
        });
        if (!ticket.firstResponseAt && !isInternal) {
          await tx.ticket.updateMany({
            where: { id: ticket.id, firstResponseAt: null },
            data: { firstResponseAt: new Date() },
          });
        }
        await recordAuditEvent({
          request,
          actor: authorization.user,
          action: "create_message",
          resource: "tickets",
          resourceId: ticket.id,
          result: "SUCCESS",
          details: { messageId: createdMessage.id, internal: Boolean(isInternal) },
        }, tx);
        return createdMessage;
      },
    });
  } catch (error) {
    console.error("Ticket Message POST Error:", error);
    return apiErrorFromUnknown(request, error, "TICKET_MESSAGE_FAILED", "無法新增工單訊息");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = await requirePermission("tickets", "update", request);
    if (!authorization.ok) return authorization.response;
    const parsed = await parseJsonBody(request, ticketUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const { status, priority, assignedToId } = parsed.data;

    const existingTicket = await prisma.ticket.findFirst({
      where: { id, ...getEntityScopeFilter(authorization.user) },
      select: { id: true, region: true },
    });
    if (!existingTicket) {
      return apiError(request, 404, "TICKET_NOT_FOUND", "找不到工單或無權操作");
    }

    if (assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: assignedToId, isActive: true, region: { in: ["ALL", existingTicket.region] } },
        select: { id: true },
      });
      if (!assignee) return apiError(request, 400, "INVALID_ASSIGNEE", "指定的負責人不存在或區域不符");
    }

    const updateData: Prisma.TicketUncheckedUpdateInput = {};
    if (status) {
      updateData.status = status;
      if (status === "RESOLVED" || status === "CLOSED") {
        updateData.resolvedAt = new Date();
      } else {
        updateData.resolvedAt = null;
      }
    }
    if (priority) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    const ticket = await prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: { id },
        data: updateData,
        include: { contact: true, account: true },
      });
      await recordAuditEvent({
        request,
        actor: authorization.user,
        action: "update",
        resource: "tickets",
        resourceId: updatedTicket.id,
        result: "SUCCESS",
      }, tx);
      return updatedTicket;
    });

    return apiSuccess(request, ticketWithCustomerResponseSchema, ticket);
  } catch (error) {
    console.error("Ticket PATCH Error:", error);
    return apiErrorFromUnknown(request, error, "TICKET_UPDATE_FAILED", "無法更新工單");
  }
}
