import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        contacts: true,
        deals: {
          include: {
            stage: true,
          },
        },
        tickets: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Accounts GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, industry, website, phone, address, customFields } = body;

    if (!name) {
      return NextResponse.json({ error: "企業公司名稱為必填" }, { status: 400 });
    }

    const account = await prisma.account.create({
      data: {
        name,
        industry,
        website,
        phone,
        address,
        customFields: customFields ? JSON.stringify(customFields) : null,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Accounts POST Error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
