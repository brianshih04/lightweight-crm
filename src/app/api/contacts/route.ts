import { prisma } from "@/lib/prisma";
import { getDealScopeFilter, getEntityScopeFilter } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { apiError, apiErrorFromUnknown, paginatedArrayResponse, parseJsonBody, parseQuery } from "@/lib/api-response";
import { contactCreateSchema, contactListQuerySchema } from "@/lib/contracts";
import { contactListItemResponseSchema, contactWithAccountResponseSchema } from "@/lib/response-contracts";
import { executeIdempotentMutation, replayIdempotentMutation } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("contacts", "read", request);
    if (!authorization.ok) return authorization.response;
    const user = authorization.user;
    const query = parseQuery(request, contactListQuerySchema);
    if (!query.ok) return query.response;
    const { search, region: queryRegion, cursor, limit } = query.data;

    const entityWhere = getEntityScopeFilter(user, queryRegion);

    const contacts = await prisma.contact.findMany({
      where: {
        ...entityWhere,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { title: { contains: search } },
                { phone: { contains: search } },
                { tags: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        account: true,
        _count: {
          select: {
            deals: { where: getDealScopeFilter(user, queryRegion) },
            tickets: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const contactItems = contacts.map(({ _count, ...contact }) => ({
      ...contact,
      dealCount: _count.deals,
      ticketCount: _count.tickets,
    }));

    return paginatedArrayResponse(request, contactItems, limit, contactListItemResponseSchema);
  } catch (error) {
    console.error("Contacts GET Error:", error);
    return apiErrorFromUnknown(request, error, "CONTACTS_READ_FAILED", "無法取得聯絡人資料");
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requirePermission("contacts", "create", request);
    if (!authorization.ok) return authorization.response;
    const user = authorization.user;
    const parsed = await parseJsonBody(request, contactCreateSchema);
    if (!parsed.ok) return parsed.response;
    const replay = await replayIdempotentMutation(request, user.id, parsed.data);
    if (replay) return replay;
    const { name, email, phone, title, accountId, region, tags, customFields } = parsed.data;

    if (accountId) {
      const account = await prisma.account.findFirst({
        where: { id: accountId, ...getEntityScopeFilter(user) },
        select: { id: true },
      });
      if (!account) {
        return apiError(request, 400, "INVALID_ACCOUNT_SCOPE", "指定的企業客戶不存在或不在可存取範圍");
      }
    }

    return executeIdempotentMutation({
      request,
      actorId: user.id,
      payload: parsed.data,
      responseSchema: contactWithAccountResponseSchema,
      operation: async (tx) => {
        const createdContact = await tx.contact.create({
          data: {
            name,
            email: email || null,
            phone,
            title,
            region: user.region === "ALL" ? (region || "NORTH") : user.region,
            accountId: accountId || null,
            tags: tags || null,
            customFields: customFields ? JSON.stringify(customFields) : null,
          },
          include: { account: true },
        });
        await tx.activity.create({
          data: {
            type: "SYSTEM",
            title: `建立了新聯絡人 ${name}`,
            contactId: createdContact.id,
            accountId: createdContact.accountId,
            userId: user.id,
          },
        });
        await recordAuditEvent({
          request,
          actor: user,
          action: "create",
          resource: "contacts",
          resourceId: createdContact.id,
          result: "SUCCESS",
        }, tx);
        return createdContact;
      },
    });
  } catch (error) {
    console.error("Contacts POST Error:", error);
    return apiErrorFromUnknown(request, error, "CONTACT_CREATE_FAILED", "無法建立聯絡人");
  }
}
