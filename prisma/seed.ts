import { PrismaClient } from "@prisma/client";
import { hashPassword, validatePassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Destructive demo seed is disabled when NODE_ENV=production");
  }
  const demoPassword = process.env.DEMO_SEED_PASSWORD;
  const passwordError = validatePassword(demoPassword);
  if (!demoPassword || passwordError) {
    throw new Error(`DEMO_SEED_PASSWORD is required. ${passwordError || ""}`.trim());
  }
  const demoPasswordHash = await hashPassword(demoPassword);

  console.log("🌱 Cleaning up database...");
  await prisma.activity.deleteMany({});
  await prisma.ticketMessage.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.stage.deleteMany({});
  await prisma.pipeline.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.workflowLog.deleteMany({});
  await prisma.workflow.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.emailTemplate.deleteMany({});
  await prisma.segment.deleteMany({});
  await prisma.authSession.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("🌱 Seeding personnel structure (roles, regions, hierarchy)...");
  // 1. System Administrator (系統管理員)
  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      password: demoPasswordHash,
      name: "系統管理員 (Admin)",
      email: "admin@company.com",
      role: "ADMIN",
      department: "資訊管理部",
      region: "ALL",
      title: "系統管理員 (System Admin)",
    },
  });

  // 2. General Manager (總經理 - 獨立專屬帳號)
  const gmUser = await prisma.user.create({
    data: {
      username: "peter_gm",
      password: demoPasswordHash,
      name: "柯博文 (Peter)",
      email: "peter.gm@company.com",
      role: "GM",
      department: "總經理室",
      region: "ALL",
      title: "總經理 (CEO / GM)",
    },
  });

  // 3. Regional Sales Manager (北部業務主管)
  const salesNorthMgr = await prisma.user.create({
    data: {
      username: "alice_mgr",
      password: demoPasswordHash,
      name: "張雅婷 (Alice)",
      email: "alice.sales@company.com",
      role: "SALES_MANAGER",
      department: "業務部",
      region: "NORTH",
      title: "北部業務處主管",
      managerId: gmUser.id,
    },
  });

  // 4. Subordinate Sales Reps
  await prisma.user.create({
    data: {
      username: "kevin_sales",
      password: demoPasswordHash,
      name: "林凱文 (Kevin)",
      email: "kevin.sales@company.com",
      role: "SALES",
      department: "業務部",
      region: "NORTH",
      title: "北部業務代表",
      managerId: salesNorthMgr.id,
    },
  });

  await prisma.user.create({
    data: {
      username: "oliver_order",
      password: demoPasswordHash,
      name: "林歐文 (Oliver)",
      email: "oliver.order@company.com",
      role: "ORDER_ADMIN",
      department: "業務部",
      region: "NORTH",
      title: "北部訂單管理員",
      managerId: salesNorthMgr.id,
    },
  });

  await prisma.user.create({
    data: {
      username: "bob_sales",
      password: demoPasswordHash,
      name: "李宗翰 (Bob)",
      email: "bob.sales@company.com",
      role: "SALES",
      department: "業務部",
      region: "CENTRAL",
      title: "中部資深業務經理",
      managerId: gmUser.id,
    },
  });

  await prisma.user.create({
    data: {
      username: "charlie_sales",
      password: demoPasswordHash,
      name: "趙冠宇 (Charlie)",
      email: "charlie.sales@company.com",
      role: "SALES",
      department: "業務部",
      region: "SOUTH",
      title: "南部業務代表",
      managerId: gmUser.id,
    },
  });

  await prisma.user.create({
    data: {
      username: "sophia_sales",
      password: demoPasswordHash,
      name: "孫佩華 (Sophia)",
      email: "sophia.overseas@company.com",
      role: "SALES",
      department: "海外事業部",
      region: "OVERSEAS",
      title: "海外亞太區商務代表",
      managerId: gmUser.id,
    },
  });

  // 5. Marketing hierarchy & Customer Support
  const mktManager = await prisma.user.create({
    data: {
      username: "maria_mkt_mgr",
      password: demoPasswordHash,
      name: "林美玲 (Maria)",
      email: "maria.mkt.manager@company.com",
      role: "MARKETING_MANAGER",
      department: "行銷部",
      region: "ALL",
      title: "市場部主管",
      managerId: gmUser.id,
    },
  });
  await prisma.user.create({
    data: {
      username: "carol_mkt",
      password: demoPasswordHash,
      name: "陳品妤 (Carol)",
      email: "carol.mkt@company.com",
      role: "MARKETING",
      department: "行銷部",
      region: "ALL",
      title: "行銷企劃主管",
      managerId: mktManager.id,
    },
  });

  await prisma.user.create({
    data: {
      username: "david_support",
      password: demoPasswordHash,
      name: "王建宏 (David)",
      email: "david.support@company.com",
      role: "SUPPORT",
      department: "客戶服務部",
      region: "ALL",
      title: "客服支援組長",
    },
  });

  console.log("🌱 Seeding default sales pipeline & stages...");
  const pipeline = await prisma.pipeline.create({
    data: {
      name: "標準企業銷售管線 (全區共用)",
      isDefault: true,
    },
  });

  const stageDefinitions = [
    { name: "初次接洽", order: 1, color: "#3b82f6", probability: 10 },
    { name: "需求確認", order: 2, color: "#6366f1", probability: 30 },
    { name: "方案報價", order: 3, color: "#eab308", probability: 60 },
    { name: "商務談判", order: 4, color: "#a855f7", probability: 80 },
    { name: "贏單 Won", order: 5, color: "#10b981", probability: 100 },
    { name: "輸單 Lost", order: 6, color: "#ef4444", probability: 0 },
  ];
  for (const stage of stageDefinitions) {
    await prisma.stage.create({ data: { pipelineId: pipeline.id, ...stage } });
  }

  console.log("✅ Personnel structure and default pipeline seeded (no demo business data).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
