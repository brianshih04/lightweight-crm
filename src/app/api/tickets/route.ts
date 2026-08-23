import { prisma } from "@/lib/prisma";
import { getEntityScopeFilter, publicUserSelect } from "@/lib/auth";
import { hasPermission, requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { apiError, apiErrorFromUnknown, apiSuccess, paginatedArrayResponse, parseJsonBody, parseQuery } from "@/lib/api-response";
import { ticketCreateSchema, ticketListQuerySchema } from "@/lib/contracts";
import { ticketListItemResponseSchema, ticketWithCustomerResponseSchema } from "@/lib/response-contracts";
import { executeIdempotentMutation, replayIdempotentMutation } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("tickets", "read", request);
    if (!authorization.ok) return authorization.response;
    const query = parseQuery(request, ticketListQuerySchema);
    if (!query.ok) return query.response;
    const { status, priority, cursor, limit } = query.data;

    const where: Record<string, unknown> = { ...getEntityScopeFilter(authorization.user) };
    if (status && status !== "ALL") where.status = status;
    if (priority && priority !== "ALL") where.priority = priority;

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        contact: true,
        account: true,
        assignedTo: { select: publicUserSelect },
        messages: {
          where: hasPermission(authorization.user, "tickets", "update") ? {} : { isInternal: false },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return paginatedArrayResponse(request, tickets, limit, ticketListItemResponseSchema);
  } catch (error) {
    console.error("Tickets GET Error:", error);
    return apiErrorFromUnknown(request, error, "TICKETS_READ_FAILED", "無法取得工單資料");
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requirePermission("tickets", "create", request);
    if (!authorization.ok) return authorization.response;
    const parsed = await parseJsonBody(request, ticketCreateSchema);
    if (!parsed.ok) return parsed.response;
    const replay = await replayIdempotentMutation(request, authorization.user.id, parsed.data);
    if (replay) return replay;
    const { subject, description, priority, channel, contactId, accountId, assignedToId } = parsed.data;

    const entityScope = getEntityScopeFilter(authorization.user);
    const contact = contactId
      ? await prisma.contact.findFirst({ where: { id: contactId, ...entityScope }, select: { id: true, name: true, region: true, accountId: true } })
      : null;
    const account = accountId
      ? await prisma.account.findFirst({ where: { id: accountId, ...entityScope }, select: { id: true, region: true } })
      : null;
    if ((contactId && !contact) || (accountId && !account)) {
      return apiError(request, 400, "INVALID_CUSTOMER_SCOPE", "指定的客戶或聯絡人不存在，或不在可存取範圍");
    }
    if ((contact && account && contact.region !== account.region) || (contact?.accountId && accountId && contact.accountId !== accountId)) {
      return apiError(request, 400, "CONTACT_ACCOUNT_MISMATCH", "聯絡人與企業客戶關聯或區域不一致");
    }

    const effectiveRegion = authorization.user.region === "ALL"
      ? (contact?.region || account?.region || "NORTH")
      : authorization.user.region;
    let effectiveAssignedToId: string | null = null;
    if (assignedToId) {
      if (!hasPermission(authorization.user, "tickets", "update")) {
        return apiError(request, 403, "ASSIGNMENT_FORBIDDEN", "目前角色不可指派工單負責人");
      }
      const assignee = await prisma.user.findFirst({
        where: { id: assignedToId, isActive: true, region: { in: ["ALL", effectiveRegion] } },
        select: { id: true },
      });
      if (!assignee) return apiError(request, 400, "INVALID_ASSIGNEE", "指定的負責人不存在或區域不符");
      effectiveAssignedToId = assignee.id;
    }

    // SLA calculate: Urgent=4h, High=8h, Medium=24h, Low=48h
    const slaHours = priority === "URGENT" ? 4 : priority === "HIGH" ? 8 : priority === "MEDIUM" ? 24 : 48;
    const slaDueAt = new Date(Date.now() + slaHours * 3600000);

    return executeIdempotentMutation({
      request,
      actorId: authorization.user.id,
      payload: parsed.data,
      responseSchema: ticketWithCustomerResponseSchema,
      operation: async (tx) => {
        const year = new Date().getFullYear();
        const sequence = await tx.ticketSequence.upsert({
          where: { year },
          create: { year, lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
        });
        const ticketNumber = `TICK-${year}-${String(sequence.lastNumber).padStart(6, "0")}`;
        const createdTicket = await tx.ticket.create({
          data: {
            ticketNumber,
            subject,
            description,
            priority: priority || "MEDIUM",
            channel: channel || "WEB",
            region: effectiveRegion,
            contactId: contact?.id || null,
            accountId: account?.id || null,
            assignedToId: effectiveAssignedToId,
            slaDueAt,
          },
          include: { contact: true, account: true },
        });
        await tx.ticketMessage.create({
          data: {
            ticketId: createdTicket.id,
            senderId: authorization.user.id,
            senderName: createdTicket.contact?.name || authorization.user.name,
            senderType: "CUSTOMER",
            isInternal: false,
            content: description,
          },
        });
        await recordAuditEvent({
          request,
          actor: authorization.user,
          action: "create",
          resource: "tickets",
          resourceId: createdTicket.id,
          result: "SUCCESS",
        }, tx);
        return createdTicket;
      },
    });
  } catch (error) {
    console.error("Tickets POST Error:", error);
    return apiErrorFromUnknown(request, error, "TICKET_CREATE_FAILED", "無法建立工單");
  }
}
