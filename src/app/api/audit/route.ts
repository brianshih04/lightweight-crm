import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { apiErrorFromUnknown, apiSuccess, parseQuery } from "@/lib/api-response";
import { auditListQuerySchema } from "@/lib/contracts";
import { auditPageResponseSchema } from "@/lib/response-contracts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("audit", "read", request);
    if (!authorization.ok) return authorization.response;

    const query = parseQuery(request, auditListQuerySchema);
    if (!query.ok) return query.response;
    const { limit, cursor, action, resource, result } = query.data;

    const where: Prisma.AuditEventWhereInput = {};
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (result) where.result = result;

    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        requestId: true,
        actorId: true,
        actorUsername: true,
        action: true,
        resource: true,
        resourceId: true,
        result: true,
        ipHash: true,
        details: true,
        createdAt: true,
      },
    });
    const hasMore = events.length > limit;
    const items = events.slice(0, limit).map((event) => ({
      ...event,
      details: event.details ? JSON.parse(event.details) : null,
    }));

    return apiSuccess(request, auditPageResponseSchema, {
      items,
      nextCursor: hasMore ? items.at(-1)?.id || null : null,
    });
  } catch (error) {
    console.error("Audit GET Error:", error);
    return apiErrorFromUnknown(request, error, "AUDIT_READ_FAILED", "無法取得稽核事件");
  }
}
