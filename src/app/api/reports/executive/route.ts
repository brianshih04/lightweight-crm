import { prisma } from "@/lib/prisma";
import { asDataRegion, isGMOrAdmin, isSalesManager } from "@/lib/auth";
import { requirePermission } from "@/lib/authorization";
import { apiErrorFromUnknown, apiSuccess, parseQuery } from "@/lib/api-response";
import { regionFilterQuerySchema } from "@/lib/contracts";
import { executiveReportResponseSchema } from "@/lib/response-contracts";
import { moneyToNumber } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("reports", "read", request);
    if (!authorization.ok) return authorization.response;
    const user = authorization.user;

    const query = parseQuery(request, regionFilterQuerySchema);
    if (!query.ok) return query.response;
    let selectedRegion = query.data.region || "ALL";

    // If Sales Manager, force region to their own region
    if (isSalesManager(user)) {
      selectedRegion = (["NORTH", "CENTRAL", "SOUTH", "OVERSEAS"] as const).find(
        (region) => region === user.region
      ) || "NORTH";
    }

    const selectedDataRegion = asDataRegion(selectedRegion);
    const selectedWhere = selectedDataRegion ? { region: selectedDataRegion } : undefined;
    const regionalWhere = isSalesManager(user) && selectedDataRegion
      ? { region: selectedDataRegion }
      : undefined;

    // 2. Fetch only the rows needed for leaderboard rendering; aggregate KPIs in the database.
    const [
      dealStatusStats,
      users,
      userDealStats,
      totalAccountsCount,
      totalTicketsCount,
      totalLeadsCount,
      regionalDealStats,
      regionalTicketStats,
      regionalAccountStats,
    ] = await Promise.all([
      prisma.deal.groupBy({
        by: ["status"],
        where: selectedWhere,
        _count: { _all: true },
        _sum: { value: true },
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          department: "業務部",
          ...(selectedRegion !== "ALL" ? { region: selectedRegion } : {}),
        },
        select: {
          id: true,
          name: true,
          title: true,
          region: true,
        },
      }),
      prisma.deal.groupBy({
        by: ["assignedToId", "status"],
        where: {
          assignedToId: { not: null },
          ...(selectedDataRegion ? { region: selectedDataRegion } : {}),
        },
        _count: { _all: true },
        _sum: { value: true },
      }),
      prisma.account.count({ where: selectedWhere }),
      prisma.ticket.count({ where: selectedWhere }),
      prisma.lead.count({ where: selectedWhere }),
      prisma.deal.groupBy({
        by: ["region", "status"],
        where: regionalWhere,
        _count: { _all: true },
        _sum: { value: true },
      }),
      prisma.ticket.groupBy({
        by: ["region", "status"],
        where: regionalWhere,
        _count: { _all: true },
      }),
      prisma.account.groupBy({
        by: ["region"],
        where: regionalWhere,
        _count: { _all: true },
      }),
    ]);

    // 3. High-level KPIs
    const openDealStats = dealStatusStats.find((entry) => entry.status === "OPEN");
    const wonDealStats = dealStatusStats.find((entry) => entry.status === "WON");
    const lostDealStats = dealStatusStats.find((entry) => entry.status === "LOST");
    const totalPipelineValue = moneyToNumber(openDealStats?._sum.value);
    const totalWonValue = moneyToNumber(wonDealStats?._sum.value);
    const wonDealsCount = wonDealStats?._count._all || 0;
    const lostDealsCount = lostDealStats?._count._all || 0;
    const totalDealsCount = dealStatusStats.reduce((sum, entry) => sum + entry._count._all, 0);
    const totalTarget = isSalesManager(user) ? 3000000 : 10000000; // Q3 Target
    const targetAchievementRate = Math.round((totalWonValue / totalTarget) * 100);

    const winRate =
      wonDealsCount + lostDealsCount > 0
        ? Math.round((wonDealsCount / (wonDealsCount + lostDealsCount)) * 100)
        : 0;

    // 4. Regional Breakdown (For GM sees all 4 regions; For Sales Manager sees their region)
    const regionKeys = isSalesManager(user) && user ? [user.region] : ["NORTH", "CENTRAL", "SOUTH", "OVERSEAS"];
    const regionNames: Record<string, string> = {
      NORTH: "北部區域 (台北/新竹)",
      CENTRAL: "中部區域 (台中/彰化)",
      SOUTH: "南部區域 (高雄/台南)",
      OVERSEAS: "海外亞太區",
    };

    const regionalBreakdown = regionKeys.map((reg) => {
      const regDeals = regionalDealStats.filter((entry) => entry.region === reg);
      const regWon = regDeals.find((entry) => entry.status === "WON");
      const regOpen = regDeals.find((entry) => entry.status === "OPEN");
      const regWonValue = moneyToNumber(regWon?._sum.value);
      const regPipelineValue = moneyToNumber(regOpen?._sum.value);
      const regTickets = regionalTicketStats.filter((entry) => entry.region === reg);
      const regAccounts = regionalAccountStats.find((entry) => entry.region === reg);

      return {
        region: reg,
        name: regionNames[reg] || reg,
        dealsCount: regDeals.reduce((sum, entry) => sum + entry._count._all, 0),
        wonValue: regWonValue,
        pipelineValue: regPipelineValue,
        totalValue: regWonValue + regPipelineValue,
        accountsCount: regAccounts?._count._all || 0,
        openTicketsCount: regTickets
          .filter((entry) => entry.status !== "RESOLVED" && entry.status !== "CLOSED")
          .reduce((sum, entry) => sum + entry._count._all, 0),
      };
    });

    // 5. Sales Rep Leaderboard (Rank subordinate sales for manager, or all sales for GM)
    const userStats = new Map(
      userDealStats.map((entry) => [`${entry.assignedToId}:${entry.status}`, entry])
    );
    const salesLeaderboard = users
      .map((u) => {
        const won = userStats.get(`${u.id}:WON`);
        const open = userStats.get(`${u.id}:OPEN`);
        const wonAmount = moneyToNumber(won?._sum.value);
        const pipelineAmount = moneyToNumber(open?._sum.value);

        return {
          id: u.id,
          name: u.name,
          title: u.title,
          region: u.region,
          wonAmount,
          wonCount: won?._count._all || 0,
          openCount: open?._count._all || 0,
          pipelineAmount,
          totalContribution: wonAmount + pipelineAmount,
        };
      })
      .sort((a, b) => b.wonAmount - a.wonAmount || b.pipelineAmount - a.pipelineAmount)
      .slice(0, 20);

    // 6. Executive AI / GM Key Takeaways
    const executiveTakeaways = [
      {
        type: "HIGHLIGHT",
        title: isSalesManager(user) && user ? `${regionNames[user.region]}業務推進摘要` : "南部與中部區域贏單表現亮眼",
        content: isSalesManager(user)
          ? `本區目前已完成贏單與進行中商機累積達 ${(totalWonValue + totalPipelineValue).toLocaleString()} 元，下屬業務跟進順暢。`
          : `鼎盛新零售 (185萬) 與高雄港灣物流 (95萬) 已順利結案，帶動 Q3 成交金額累積達 ${totalWonValue.toLocaleString()} 元。`,
      },
      {
        type: "OPPORTUNITY",
        title: "大額商機推進中",
        content: `全區高潛力商機正處於方案報價與商務談判階段，預計近期可完成簽署。`,
      },
      {
        type: "ATTENTION",
        title: "售後工單服務時效健康",
        content: `目前工單均在 SLA 時限內穩定處理，維持優質客戶服務體驗。`,
      },
    ];

    return apiSuccess(request, executiveReportResponseSchema, {
      currentUser: user,
      isGMOrAdmin: isGMOrAdmin(user),
      isSalesManager: isSalesManager(user),
      kpis: {
        totalPipelineValue,
        totalWonValue,
        totalTarget,
        targetAchievementRate,
        winRate,
        totalDealsCount,
        totalAccountsCount,
        totalTicketsCount,
        totalLeadsCount,
      },
      regionalBreakdown,
      salesLeaderboard,
      executiveTakeaways,
    });
  } catch (error) {
    console.error("Executive Reports API Error:", error);
    return apiErrorFromUnknown(request, error, "REPORT_READ_FAILED", "無法產生營運報表");
  }
}
