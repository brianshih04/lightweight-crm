import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isGMOrAdmin, isSalesManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    // 1. Role Authorization Check: Only GM, Admin, or Sales Manager can access
    if (!isGMOrAdmin(user) && !isSalesManager(user)) {
      return NextResponse.json(
        { error: "權限不足：僅總經理 (GM)、業務處主管與系統管理員可檢視高階決策分析報表" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    let selectedRegion = searchParams.get("region") || "ALL";

    // If Sales Manager, force region to their own region
    if (isSalesManager(user)) {
      selectedRegion = user?.region || "NORTH";
    }

    // 2. Fetch scoped data
    const [deals, users, accounts, tickets, leads] = await Promise.all([
      prisma.deal.findMany({
        where: selectedRegion !== "ALL" ? { region: selectedRegion } : undefined,
        include: {
          assignedTo: true,
          account: true,
          stage: true,
        },
      }),
      prisma.user.findMany({
        where: {
          department: "業務部",
          ...(isSalesManager(user) && user ? { region: user.region } : {}),
        },
        include: {
          assignedDeals: {
            include: { stage: true },
          },
        },
      }),
      prisma.account.findMany({
        where: selectedRegion !== "ALL" ? { region: selectedRegion } : undefined,
      }),
      prisma.ticket.findMany({
        where: selectedRegion !== "ALL" ? { region: selectedRegion } : undefined,
      }),
      prisma.lead.findMany({
        where: selectedRegion !== "ALL" ? { region: selectedRegion } : undefined,
      }),
    ]);

    // 3. High-level KPIs
    const openDeals = deals.filter((d) => d.status === "OPEN");
    const wonDeals = deals.filter((d) => d.status === "WON");
    const totalPipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
    const totalWonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const totalTarget = isSalesManager(user) ? 3000000 : 10000000; // Q3 Target
    const targetAchievementRate = Math.round((totalWonValue / totalTarget) * 100);

    const winRate =
      deals.length > 0
        ? Math.round((wonDeals.length / (wonDeals.length + deals.filter((d) => d.status === "LOST").length || 1)) * 100)
        : 0;

    // 4. Regional Breakdown (For GM sees all 4 regions; For Sales Manager sees their region)
    const allDeals = await prisma.deal.findMany({
      include: { stage: true },
    });
    const allTickets = await prisma.ticket.findMany();
    const allAccounts = await prisma.account.findMany();

    const regionKeys = isSalesManager(user) && user ? [user.region] : ["NORTH", "CENTRAL", "SOUTH", "OVERSEAS"];
    const regionNames: Record<string, string> = {
      NORTH: "北部區域 (台北/新竹)",
      CENTRAL: "中部區域 (台中/彰化)",
      SOUTH: "南部區域 (高雄/台南)",
      OVERSEAS: "海外亞太區",
    };

    const regionalBreakdown = regionKeys.map((reg) => {
      const regDeals = allDeals.filter((d) => d.region === reg);
      const regWon = regDeals.filter((d) => d.status === "WON");
      const regOpen = regDeals.filter((d) => d.status === "OPEN");
      const regWonValue = regWon.reduce((sum, d) => sum + d.value, 0);
      const regPipelineValue = regOpen.reduce((sum, d) => sum + d.value, 0);
      const regTickets = allTickets.filter((t) => t.region === reg);
      const regAccounts = allAccounts.filter((a) => a.region === reg);

      return {
        region: reg,
        name: regionNames[reg] || reg,
        dealsCount: regDeals.length,
        wonValue: regWonValue,
        pipelineValue: regPipelineValue,
        totalValue: regWonValue + regPipelineValue,
        accountsCount: regAccounts.length,
        openTicketsCount: regTickets.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length,
      };
    });

    // 5. Sales Rep Leaderboard (Rank subordinate sales for manager, or all sales for GM)
    const salesLeaderboard = users
      .map((u) => {
        const uWonDeals = u.assignedDeals.filter((d) => d.status === "WON");
        const uOpenDeals = u.assignedDeals.filter((d) => d.status === "OPEN");
        const wonAmount = uWonDeals.reduce((sum, d) => sum + d.value, 0);
        const pipelineAmount = uOpenDeals.reduce((sum, d) => sum + d.value, 0);

        return {
          id: u.id,
          name: u.name,
          title: u.title,
          region: u.region,
          wonAmount,
          wonCount: uWonDeals.length,
          openCount: uOpenDeals.length,
          pipelineAmount,
          totalContribution: wonAmount + pipelineAmount,
        };
      })
      .sort((a, b) => b.wonAmount - a.wonAmount);

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

    return NextResponse.json({
      currentUser: user,
      isGMOrAdmin: isGMOrAdmin(user),
      isSalesManager: isSalesManager(user),
      kpis: {
        totalPipelineValue,
        totalWonValue,
        totalTarget,
        targetAchievementRate,
        winRate,
        totalDealsCount: deals.length,
        totalAccountsCount: accounts.length,
        totalTicketsCount: tickets.length,
        totalLeadsCount: leads.length,
      },
      regionalBreakdown,
      salesLeaderboard,
      executiveTakeaways,
    });
  } catch (error) {
    console.error("Executive Reports API Error:", error);
    return NextResponse.json({ error: "Failed to generate executive report" }, { status: 500 });
  }
}
