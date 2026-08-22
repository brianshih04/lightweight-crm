import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Core KPIs
    const [totalContacts, totalAccounts, deals, openTickets, sentCampaigns, activities] =
      await Promise.all([
        prisma.contact.count(),
        prisma.account.count(),
        prisma.deal.findMany({
          include: {
            stage: true,
          },
        }),
        prisma.ticket.findMany({
          where: {
            status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] },
          },
          include: {
            contact: true,
            account: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.campaign.findMany({
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        prisma.activity.findMany({
          include: {
            contact: true,
            deal: true,
            user: true,
          },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      ]);

    // Calculate revenue metrics
    const totalPipelineValue = deals
      .filter((d) => d.status === "OPEN")
      .reduce((sum, d) => sum + d.value, 0);

    const wonValue = deals
      .filter((d) => d.status === "WON")
      .reduce((sum, d) => sum + d.value, 0);

    const openDealsCount = deals.filter((d) => d.status === "OPEN").length;
    const wonDealsCount = deals.filter((d) => d.status === "WON").length;
    const winRate =
      deals.length > 0
        ? Math.round((wonDealsCount / (wonDealsCount + deals.filter((d) => d.status === "LOST").length || 1)) * 100)
        : 0;

    // Pipeline breakdown by stage
    const stages = await prisma.stage.findMany({
      orderBy: { order: "asc" },
      include: {
        deals: true,
      },
    });

    const pipelineStages = stages.map((st) => ({
      name: st.name,
      color: st.color,
      count: st.deals.length,
      totalValue: st.deals.reduce((sum, d) => sum + d.value, 0),
    }));

    return NextResponse.json({
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
    return NextResponse.json({ error: "Failed to fetch dashboard metrics" }, { status: 500 });
  }
}
