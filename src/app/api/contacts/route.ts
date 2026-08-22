import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getEntityScopeFilter } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const queryRegion = searchParams.get("region");

    const entityWhere = getEntityScopeFilter(user, queryRegion);

    const contacts = await prisma.contact.findMany({
      where: {
        ...entityWhere,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { title: { contains: search } },
                { phone: { contains: search } },
                { tags: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        account: true,
        deals: true,
        tickets: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Contacts GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { name, email, phone, title, accountId, region, tags, customFields } = body;

    if (!name) {
      return NextResponse.json({ error: "聯絡人姓名為必填" }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        email,
        phone,
        title,
        region: region || user?.region || "NORTH",
        accountId: accountId || null,
        tags: tags || null,
        customFields: customFields ? JSON.stringify(customFields) : null,
      },
      include: {
        account: true,
      },
    });

    await prisma.activity.create({
      data: {
        type: "SYSTEM",
        title: `建立了新聯絡人 ${name}`,
        contactId: contact.id,
        accountId: contact.accountId,
        userId: user?.id,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Contacts POST Error:", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
