import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getLeadScopeFilter, isGMOrAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const queryRegion = searchParams.get("region");

    const leadWhere = getLeadScopeFilter(user, queryRegion);

    const leads = await prisma.lead.findMany({
      where: leadWhere,
      include: {
        assignedTo: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Leads GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { action } = body;

    // Handle Lead Conversion
    if (action === "CONVERT") {
      const { leadId, dealTitle, dealValue } = body;

      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        return NextResponse.json({ error: "找不到指定的線索" }, { status: 404 });
      }

      // 1. Create or Find Account
      let account = null;
      if (lead.company) {
        account = await prisma.account.findFirst({
          where: { name: lead.company },
        });
        if (!account) {
          account = await prisma.account.create({
            data: {
              name: lead.company,
              phone: lead.phone,
              region: lead.region || user?.region || "NORTH",
            },
          });
        }
      }

      // 2. Create Contact
      const contact = await prisma.contact.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          region: lead.region || user?.region || "NORTH",
          accountId: account?.id,
          tags: "由線索轉換, 潛在客戶",
        },
      });

      // 3. Create Deal
      let deal = null;
      const defaultPipeline = await prisma.pipeline.findFirst({
        where: { isDefault: true },
        include: { stages: { orderBy: { order: "asc" } } },
      });

      if (defaultPipeline && defaultPipeline.stages.length > 0) {
        const firstStage = defaultPipeline.stages[0];
        deal = await prisma.deal.create({
          data: {
            title: dealTitle || `${lead.company || lead.name} - 新業務機會`,
            value: parseFloat(dealValue) || 0,
            region: lead.region || user?.region || "NORTH",
            pipelineId: defaultPipeline.id,
            stageId: firstStage.id,
            contactId: contact.id,
            accountId: account?.id,
            assignedToId: lead.assignedToId || user?.id,
            notes: lead.notes,
          },
        });
      }

      // 4. Update Lead status
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "CONVERTED" },
      });

      // 5. Create Activity log
      await prisma.activity.create({
        data: {
          type: "STAGE_CHANGE",
          title: `線索「${lead.name}」已成功轉換為正式聯絡人與商機`,
          contactId: contact.id,
          accountId: account?.id,
          dealId: deal?.id,
          userId: user?.id,
        },
      });

      return NextResponse.json({ success: true, contact, account, deal });
    }

    // Normal Lead Creation
    const { name, email, phone, company, source, score, region, notes, assignedToId } = body;
    if (!name) {
      return NextResponse.json({ error: "線索姓名為必填" }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        company,
        region: region || user?.region || "NORTH",
        source: source || "Website",
        score: score ? parseInt(score) : 50,
        notes,
        assignedToId: assignedToId || user?.id || null,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Leads POST Error:", error);
    return NextResponse.json({ error: "Failed to process lead" }, { status: 500 });
  }
}
