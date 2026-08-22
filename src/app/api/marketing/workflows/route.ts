import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      include: {
        logs: {
          orderBy: { executedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error("Workflows GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, triggerEvent, conditions, actions } = body;

    if (!name || !triggerEvent || !actions) {
      return NextResponse.json({ error: "流程名稱、觸發事件與動作為必填" }, { status: 400 });
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        triggerEvent,
        conditions: typeof conditions === "object" ? JSON.stringify(conditions) : conditions,
        actions: typeof actions === "object" ? JSON.stringify(actions) : actions,
        isActive: true,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("Workflows POST Error:", error);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "流程 ID 為必填" }, { status: 400 });
    }

    const workflow = await prisma.workflow.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Workflows PATCH Error:", error);
    return NextResponse.json({ error: "Failed to toggle workflow status" }, { status: 500 });
  }
}
