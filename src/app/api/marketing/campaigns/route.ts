import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [campaigns, segments, templates] = await Promise.all([
      prisma.campaign.findMany({
        include: {
          segment: true,
          template: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.segment.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.emailTemplate.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ campaigns, segments, templates });
  } catch (error) {
    console.error("Campaigns GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch marketing campaigns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, channel, segmentId, templateId, subject, scheduledAt } = body;

    if (!name) {
      return NextResponse.json({ error: "行銷活動名稱為必填" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        channel: channel || "EMAIL",
        segmentId: segmentId || null,
        templateId: templateId || null,
        subject,
        status: scheduledAt ? "SCHEDULED" : "DRAFT",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
      include: {
        segment: true,
        template: true,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Campaigns POST Error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
