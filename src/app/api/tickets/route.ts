import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (priority && priority !== "ALL") where.priority = priority;

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        contact: true,
        account: true,
        assignedTo: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Tickets GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subject, description, priority, channel, contactId, accountId, assignedToId } = body;

    if (!subject || !description) {
      return NextResponse.json({ error: "工單主旨與描述為必填" }, { status: 400 });
    }

    const ticketCount = await prisma.ticket.count();
    const ticketNumber = `TICK-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(3, "0")}`;

    // SLA calculate: Urgent=4h, High=8h, Medium=24h, Low=48h
    const slaHours = priority === "URGENT" ? 4 : priority === "HIGH" ? 8 : priority === "MEDIUM" ? 24 : 48;
    const slaDueAt = new Date(Date.now() + slaHours * 3600000);

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        subject,
        description,
        priority: priority || "MEDIUM",
        channel: channel || "WEB",
        contactId: contactId || null,
        accountId: accountId || null,
        assignedToId: assignedToId || null,
        slaDueAt,
      },
      include: {
        contact: true,
        account: true,
      },
    });

    // Create first message
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderName: ticket.contact?.name || "系統進單",
        senderType: "CUSTOMER",
        isInternal: false,
        content: description,
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Tickets POST Error:", error);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
