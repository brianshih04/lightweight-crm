import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        contact: true,
        account: true,
        assignedTo: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "找不到此工單" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Ticket Detail GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { content, isInternal, senderName } = body;

    if (!content) {
      return NextResponse.json({ error: "訊息內容不能為空" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "找不到此工單" }, { status: 404 });
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderName: senderName || "客服專員 (David)",
        senderType: "AGENT",
        isInternal: Boolean(isInternal),
        content,
      },
    });

    // If first response, set firstResponseAt
    if (!ticket.firstResponseAt && !isInternal) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { firstResponseAt: new Date() },
      });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Ticket Message POST Error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, priority, assignedToId } = body;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "RESOLVED" || status === "CLOSED") {
        updateData.resolvedAt = new Date();
      }
    }
    if (priority) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        contact: true,
        account: true,
      },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Ticket PATCH Error:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
