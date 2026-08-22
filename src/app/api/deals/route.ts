import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region");

    const dealWhere: any = {};
    if (region && region !== "ALL") {
      dealWhere.region = region;
    }

    const pipelines = await prisma.pipeline.findMany({
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            deals: {
              where: dealWhere,
              include: {
                contact: true,
                account: true,
                assignedTo: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    const defaultPipeline = pipelines.find((p) => p.isDefault) || pipelines[0];

    return NextResponse.json({
      pipelines,
      activePipeline: defaultPipeline,
    });
  } catch (error) {
    console.error("Deals GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch deals and pipeline" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, value, pipelineId, stageId, contactId, accountId, assignedToId, region, expectedCloseDate, notes } = body;

    if (!title || !pipelineId || !stageId) {
      return NextResponse.json({ error: "商機名稱、管線與階段為必填" }, { status: 400 });
    }

    const deal = await prisma.deal.create({
      data: {
        title,
        value: parseFloat(value) || 0,
        region: region || "NORTH",
        pipelineId,
        stageId,
        contactId: contactId || null,
        accountId: accountId || null,
        assignedToId: assignedToId || null,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        notes,
      },
      include: {
        stage: true,
        contact: true,
        account: true,
        assignedTo: true,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: "NOTE",
        title: `建立了新商機「${title}」(${deal.region} 區)`,
        content: `金額：${deal.value} 元`,
        contactId: deal.contactId,
        accountId: deal.accountId,
        dealId: deal.id,
      },
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    console.error("Deals POST Error:", error);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { dealId, stageId, status } = body;

    if (!dealId) {
      return NextResponse.json({ error: "商機 ID 為必填" }, { status: 400 });
    }

    const updateData: any = {};
    if (stageId) updateData.stageId = stageId;
    if (status) updateData.status = status;

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
      include: {
        stage: true,
        contact: true,
      },
    });

    // Log stage change activity
    if (stageId) {
      await prisma.activity.create({
        data: {
          type: "STAGE_CHANGE",
          title: `商機階段變更為「${deal.stage.name}」`,
          contactId: deal.contactId,
          dealId: deal.id,
        },
      });
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error("Deals PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}
