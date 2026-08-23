import { prisma } from "@/lib/prisma";
import { getDealScopeFilter, getEntityScopeFilter } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { apiErrorFromUnknown, paginatedArrayResponse, parseJsonBody, parseQuery } from "@/lib/api-response";
import { accountCreateSchema, regionalListQuerySchema } from "@/lib/contracts";
import { accountListItemResponseSchema, accountResponseSchema } from "@/lib/response-contracts";
import { executeIdempotentMutation, replayIdempotentMutation } from "@/lib/idempotency";
import { moneyToNumber } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("accounts", "read", request);
    if (!authorization.ok) return authorization.response;
    const user = authorization.user;
    const query = parseQuery(request, regionalListQuerySchema);
    if (!query.ok) return query.response;
    const { region: queryRegion, cursor, limit } = query.data;

    const entityWhere = getEntityScopeFilter(user, queryRegion);

    const accounts = await prisma.account.findMany({
      where: entityWhere,
      include: {
        _count: { select: { contacts: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const dealTotals = accounts.length
      ? await prisma.deal.groupBy({
          by: ["accountId"],
          where: {
            ...getDealScopeFilter(user, queryRegion),
            accountId: { in: accounts.map((account) => account.id) },
          },
          _sum: { value: true },
        })
      : [];
    const totalByAccount = new Map(
      dealTotals.map((entry) => [entry.accountId, moneyToNumber(entry._sum.value)])
    );
    const accountItems = accounts.map(({ _count, ...account }) => ({
      ...account,
      contactCount: _count.contacts,
      totalDealValue: totalByAccount.get(account.id) || 0,
    }));

    return paginatedArrayResponse(request, accountItems, limit, accountListItemResponseSchema);
  } catch (error) {
    console.error("Accounts GET Error:", error);
    return apiErrorFromUnknown(request, error, "ACCOUNTS_READ_FAILED", "無法取得企業客戶資料");
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requirePermission("accounts", "create", request);
    if (!authorization.ok) return authorization.response;
    const user = authorization.user;
    const parsed = await parseJsonBody(request, accountCreateSchema);
    if (!parsed.ok) return parsed.response;
    const replay = await replayIdempotentMutation(request, user.id, parsed.data);
    if (replay) return replay;
    const { name, industry, region, website, phone, address, customFields } = parsed.data;

    return executeIdempotentMutation({
      request,
      actorId: user.id,
      payload: parsed.data,
      responseSchema: accountResponseSchema,
      operation: async (tx) => {
        const createdAccount = await tx.account.create({
          data: {
            name,
            industry,
            region: user.region === "ALL" ? (region || "NORTH") : user.region,
            website,
            phone,
            address,
            customFields: customFields ? JSON.stringify(customFields) : null,
          },
        });
        await recordAuditEvent({
          request,
          actor: user,
          action: "create",
          resource: "accounts",
          resourceId: createdAccount.id,
          result: "SUCCESS",
        }, tx);
        return createdAccount;
      },
    });
  } catch (error) {
    console.error("Accounts POST Error:", error);
    return apiErrorFromUnknown(request, error, "ACCOUNT_CREATE_FAILED", "無法建立企業客戶");
  }
}
