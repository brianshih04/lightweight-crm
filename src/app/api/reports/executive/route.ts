import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedRegion = searchParams.get("region") || "ALL";

    // 1. Fetch all data
    const [deals, users, accounts, tickets, leads, stages] = await Promise.all([
      prisma.deal.findMany({
        where: selectedRegion !== "ALL" ? { region: selectedRegion } : undefined,
        include: {
          assignedTo: true,
          account: true,
          stage: true,
        },
      }),
      prisma.user.findMany({
        where: { department: "業務部" },
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
      prisma.stage.findMany({
        orderBy: { order: "asc" },
      }),
    ]);

    // 2. High-level KPIs
    const openDeals = deals.filter((d) => d.status === "OPEN");
    const wonDeals = deals.filter((d) => d.status === "WON");
    const totalPipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
    const totalWonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const totalTarget = 10000000; // Q3 Target 10,000,000 TWD
    const targetAchievementRate = Math.round((totalWonValue / totalTarget) * 100);

    const winRate =
      deals.length > 0
        ? Math.round((wonDeals.length / (wonDeals.length + deals.filter((d) => d.status === "LOST").length || 1)) * 100)
        : 0;

    // 3. Regional Breakdown (North, Central, South, Overseas)
    const allDeals = await prisma.deal.findMany({
      include: { stage: true },
    });
    const allTickets = await prisma.ticket.findMany();
    const allAccounts = await prisma.account.findMany();

    const regionKeys = ["NORTH", "CENTRAL", "SOUTH", "OVERSEAS"];
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

    // 4. Sales Rep Leaderboard
    const salesLeaderboard = users.map((u) => {
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
    }).sort((a, b) => b.wonAmount - a.wonAmount);

    // 5. Executive AI / GM Key Takeaways
    const executiveTakeaways = [
      {
        type: "HIGHLIGHT",
        title: "南部與中部區域贏單表現亮眼",
        content: `鼎盛新零售 (185萬) 與高雄港灣物流 (95萬) 已順利結案，帶動 Q3 成交金額累積達 ${totalWonValue.toLocaleString()} 元。`,
      },
      {
        type: "OPPORTUNITY",
        title: "海外亞太與南部大單為下一波營收主力",
        content: `SingaTech 跨境專案 (360萬) 及南光精密維修工單案 (210萬) 目前處於商務報價與談判階段，預計下月可望轉化。`,
      },
      {
        type: "ATTENTION",
        title: "售後工單服務時效健康",
        content: `全區 ${tickets.length} 件工單均在 SLA 時限內穩定處理，北部 API 刷新問題已進入工程修補階段。`,
      },
    ];

    return NextResponse.json({
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
