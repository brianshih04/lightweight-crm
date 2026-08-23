import { prisma } from "@/lib/prisma";
import { getDealScopeFilter, getEntityScopeFilter, nestedUserSelect } from "@/lib/auth";
import { hasPermission, requirePermission } from "@/lib/authorization";
import { apiError, apiErrorFromUnknown, paginatedArrayResponse, parseQuery } from "@/lib/api-response";
import { contactRelatedListQuerySchema } from "@/lib/contracts";
import {
  contactActivityResponseSchema,
  contactDealResponseSchema,
  ticketResponseSchema,
} from "@/lib/response-contracts";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = await requirePermission("contacts", "read", request);
    if (!authorization.ok) return authorization.response;
    const query = parseQuery(request, contactRelatedListQuerySchema);
    if (!query.ok) return query.response;
    const { type, cursor, limit } = query.data;

    const contact = await prisma.contact.findFirst({
      where: { id, ...getEntityScopeFilter(authorization.user) },
      select: { id: true },
    });
    if (!contact) return apiError(request, 404, "CONTACT_NOT_FOUND", "找不到此聯絡人");

    const page = {
      orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    };

    if (type === "deals") {
      // 商機資料額外要求 deals:read，防止僅有 contacts:read 的角色取得商機內容
      if (!hasPermission(authorization.user, "deals", "read")) {
        return apiError(request, 403, "FORBIDDEN", "沒有讀取商機資料的權限");
      }
      const deals = await prisma.deal.findMany({
        where: { contactId: id, ...getDealScopeFilter(authorization.user) },
        include: { stage: true },
        ...page,
      });
      return paginatedArrayResponse(request, deals, limit, contactDealResponseSchema);
    }
    if (type === "tickets") {
      const tickets = await prisma.ticket.findMany({
        where: { contactId: id, ...getEntityScopeFilter(authorization.user) },
        ...page,
      });
      return paginatedArrayResponse(request, tickets, limit, ticketResponseSchema);
    }

    const activities = await prisma.activity.findMany({
      where: { contactId: id },
      include: { user: { select: nestedUserSelect } },
      ...page,
    });
    return paginatedArrayResponse(request, activities, limit, contactActivityResponseSchema);
  } catch (error) {
    console.error("Contact Related GET Error:", error);
    return apiErrorFromUnknown(request, error, "CONTACT_RELATED_READ_FAILED", "無法取得聯絡人關聯資料");
  }
}
