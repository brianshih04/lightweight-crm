import { prisma } from "@/lib/prisma";
import { getDealScopeFilter, getEntityScopeFilter, isGMOrAdmin, publicUserSelect } from "@/lib/auth";
import { hasPermission, requirePermission } from "@/lib/authorization";
import { apiErrorFromUnknown, apiSuccess, parseQuery } from "@/lib/api-response";
import { regionFilterQuerySchema } from "@/lib/contracts";
import { dashboardResponseSchema } from "@/lib/response-contracts";
import { moneyToNumber } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("dashboard", "read", request);
    if (!authorization.ok) return authorization.response;
    const user = authorization.user;
    const query = parseQuery(request, regionFilterQuerySchema);
    if (!query.ok) return query.response;
    const queryRegion = query.data.region;

    const dealWhere = getDealScopeFilter(user, queryRegion);
    const entityWhere = getEntityScopeFilter(user, queryRegion);
    const activityWhere = isGMOrAdmin(user) || user.region === "ALL"
      ? {}
      : {
          OR: [
            { contact: { region: user.region } },
            { account: { region: user.region } },
            { ticket: { region: user.region } },
            ...(user.role === "SALES"
              ? [{ deal: { region: user.region, assignedToId: user.id } }, { userId: user.id }]
              : [{ deal: { region: user.region } }]),
          ],
        };

    // 1. Core KPIs filtered by user's permission scope
    const [totalContacts, totalAccounts, dealStatusStats, openTickets, sentCampaigns, activities] =
      await Promise.all([
        prisma.contact.count({ where: entityWhere }),
        prisma.account.count({ where: entityWhere }),
        prisma.deal.groupBy({
          by: ["status"],
          where: dealWhere,
          _count: { _all: true },
          _sum: { value: true },
        }),
        prisma.ticket.findMany({
          where: {
            ...entityWhere,
            status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] },
          },
          include: {
            contact: true,
            account: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        hasPermission(user, "campaigns", "read")
          ? prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 3 })
          : Promise.resolve([]),
        prisma.activity.findMany({
          where: activityWhere,
          include: {
            contact: true,
            deal: true,
            user: { select: publicUserSelect },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      ]);

    // Calculate revenue metrics
    const openStats = dealStatusStats.find((entry) => entry.status === "OPEN");
    const wonStats = dealStatusStats.find((entry) => entry.status === "WON");
    const lostStats = dealStatusStats.find((entry) => entry.status === "LOST");
    const totalPipelineValue = moneyToNumber(openStats?._sum.value);
    const wonValue = moneyToNumber(wonStats?._sum.value);
    const openDealsCount = openStats?._count._all || 0;
    const wonDealsCount = wonStats?._count._all || 0;
    const lostDealsCount = lostStats?._count._all || 0;
    const winRate =
      wonDealsCount + lostDealsCount > 0
        ? Math.round((wonDealsCount / (wonDealsCount + lostDealsCount)) * 100)
        : 0;

    // Pipeline breakdown by stage
    const [stages, stageStats] = await Promise.all([
      prisma.stage.findMany({ orderBy: { order: "asc" } }),
      prisma.deal.groupBy({
        by: ["stageId"],
        where: dealWhere,
        _count: { _all: true },
        _sum: { value: true },
      }),
    ]);
    const statsByStage = new Map(stageStats.map((entry) => [entry.stageId, entry]));

    const pipelineStages = stages.map((st) => ({
      name: st.name,
      color: st.color,
      count: statsByStage.get(st.id)?._count._all || 0,
      totalValue: moneyToNumber(statsByStage.get(st.id)?._sum.value),
    }));

    return apiSuccess(request, dashboardResponseSchema, {
      currentUser: user,
      isGMOrAdmin: isGMOrAdmin(user),
      kpis: {
        totalContacts,
        totalAccounts,
        openDealsCount,
        totalPipelineValue,
        wonValue,
        winRate,
        openTicketsCount: openTickets.length,
      },
      pipelineStages,
      openTickets,
      sentCampaigns,
      activities,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return apiErrorFromUnknown(request, error, "DASHBOARD_READ_FAILED", "無法取得儀表板資料");
  }
}
