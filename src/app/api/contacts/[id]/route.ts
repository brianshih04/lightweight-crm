import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        account: true,
        deals: {
          include: {
            stage: true,
          },
          orderBy: { createdAt: "desc" },
        },
        tickets: {
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: {
            user: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "找不到此聯絡人" }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Contact Detail GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch contact details" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { type, title, content } = body;

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
    });

    if (!contact) {
      return NextResponse.json({ error: "找不到此聯絡人" }, { status: 404 });
    }

    const activity = await prisma.activity.create({
      data: {
        type: type || "NOTE",
        title: title || "新增備忘記錄",
        content,
        contactId: contact.id,
        accountId: contact.accountId,
      },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error("Contact Activity POST Error:", error);
    return NextResponse.json({ error: "Failed to add activity" }, { status: 500 });
  }
}
