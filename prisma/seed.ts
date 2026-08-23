import { PrismaClient } from "@prisma/client";
import { hashPassword, validatePassword } from "../src/lib/password";

const prisma = new PrismaClient();

// 實際組織結構：三個行銷部對應三個市場區域（台灣併入第二市場）。
// 區域槽位對應：NORTH=第一市場(中南美/菲律賓)、CENTRAL=第二市場(美歐/俄印/台灣)、
// SOUTH=第三市場(俄羅斯/中東)、OVERSEAS=總部與其他（訂單管理員等支援單位）。
// 訂單管理員為支援單位，商機權限為全市場，掛在市場部主管（thomas_mkt）之下。
const ORG_STRUCTURE = {
  gm: { username: "thomas", name: "Thomas", department: "總經理室", title: "總經理 (GM)" },
  marketingManager: {
    username: "thomas_mkt",
    name: "Thomas",
    department: "市場部",
    title: "市場部主管",
  },
  salesTeams: [
    {
      manager: { username: "ivan", name: "Ivan", title: "第一行銷部主管（中南美／菲律賓）" },
      department: "第一行銷部",
      region: "NORTH",
      reps: [{ username: "maite", name: "Maite", title: "行銷業務專員（中南美／菲律賓）" }],
    },
    {
      manager: { username: "jane", name: "Jane", title: "第二行銷部主管（美國／歐洲／俄羅斯 OBM／印度 TVS-E／台灣）" },
      department: "第二行銷部",
      region: "CENTRAL",
      reps: [{ username: "lauren", name: "Lauren", title: "行銷業務專員（美國／歐洲／俄羅斯 OBM／印度 TVS-E／台灣）" }],
    },
    {
      manager: { username: "james", name: "James", title: "第三行銷部主管（俄羅斯 Katusha／中東 DOX／以色列／伊朗）" },
      department: "第三行銷部",
      region: "SOUTH",
      reps: [{ username: "vivien", name: "Vivien", title: "行銷業務專員（俄羅斯 Katusha／中東 DOX／以色列／伊朗）" }],
    },
  ],
  orderAdmins: [
    { username: "linda", name: "Linda", title: "訂單管理員（支援各行銷部）" },
    { username: "brenda", name: "Brenda", title: "訂單管理員（支援各行銷部）" },
  ],
  supportManager: { username: "kidd", name: "Kidd", department: "客戶服務部", title: "客服部主管" },
  // Kidd 兼任企劃部主管（與客服部主管分開兩個帳號，比照 GM/市場部主管模式）
  planningManager: { username: "kidd_planning", name: "Kidd", department: "企劃部", title: "企劃部主管" },
} as const;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Destructive demo seed is disabled when NODE_ENV=production");
  }
  const demoPassword = process.env.DEMO_SEED_PASSWORD;
  const passwordError = validatePassword(demoPassword);
  if (!demoPassword || passwordError) {
    throw new Error(`DEMO_SEED_PASSWORD is required. ${passwordError || ""}`.trim());
  }
  const passwordHash = await hashPassword(demoPassword);

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
  // 系統管理員僅存在於隔離的 demo DB；正式環境請使用首次啟用流程建立 ADMIN。
  await prisma.user.create({
    data: {
      username: "admin",
      password: passwordHash,
        mustChangePassword: true,
      name: "系統管理員 (Admin)",
      email: "admin@company.com",
      role: "ADMIN",
      department: "資訊管理部",
      region: "ALL",
      title: "系統管理員 (System Admin)",
    },
  });

  const gm = await prisma.user.create({
    data: {
      username: ORG_STRUCTURE.gm.username,
      password: passwordHash,
        mustChangePassword: true,
      name: ORG_STRUCTURE.gm.name,
      email: "thomas@company.com",
      role: "GM",
      department: ORG_STRUCTURE.gm.department,
      region: "ALL",
      title: ORG_STRUCTURE.gm.title,
    },
  });

  const marketingManager = await prisma.user.create({
    data: {
      username: ORG_STRUCTURE.marketingManager.username,
      password: passwordHash,
        mustChangePassword: true,
      name: ORG_STRUCTURE.marketingManager.name,
      email: "thomas.mkt@company.com",
      role: "MARKETING_MANAGER",
      department: ORG_STRUCTURE.marketingManager.department,
      region: "ALL",
      title: ORG_STRUCTURE.marketingManager.title,
      managerId: gm.id,
    },
  });

  for (const team of ORG_STRUCTURE.salesTeams) {
    const manager = await prisma.user.create({
      data: {
        username: team.manager.username,
        password: passwordHash,
        mustChangePassword: true,
        name: team.manager.name,
        email: `${team.manager.username}@company.com`,
        role: "SALES_MANAGER",
        department: team.department,
        region: team.region,
        title: team.manager.title,
        managerId: gm.id,
      },
    });

    for (const rep of team.reps) {
      await prisma.user.create({
        data: {
          username: rep.username,
          password: passwordHash,
        mustChangePassword: true,
          name: rep.name,
          email: `${rep.username}@company.com`,
          role: "SALES",
          department: team.department,
          region: team.region,
          title: rep.title,
          managerId: manager.id,
        },
      });
    }
  }

  for (const orderAdmin of ORG_STRUCTURE.orderAdmins) {
    await prisma.user.create({
      data: {
        username: orderAdmin.username,
        password: passwordHash,
        mustChangePassword: true,
        name: orderAdmin.name,
        email: `${orderAdmin.username}@company.com`,
        role: "ORDER_ADMIN",
        department: "訂單管理（支援）",
        region: "OVERSEAS",
        title: orderAdmin.title,
        managerId: marketingManager.id,
      },
    });
  }

  await prisma.user.create({
    data: {
      username: ORG_STRUCTURE.supportManager.username,
      password: passwordHash,
        mustChangePassword: true,
      name: ORG_STRUCTURE.supportManager.name,
      email: "kidd@company.com",
      role: "SUPPORT",
      department: ORG_STRUCTURE.supportManager.department,
      region: "ALL",
      title: ORG_STRUCTURE.supportManager.title,
      managerId: gm.id,
    },
  });

  await prisma.user.create({
    data: {
      username: ORG_STRUCTURE.planningManager.username,
      password: passwordHash,
        mustChangePassword: true,
      name: ORG_STRUCTURE.planningManager.name,
      email: "kidd.planning@company.com",
      role: "MARKETING_MANAGER",
      department: ORG_STRUCTURE.planningManager.department,
      region: "ALL",
      title: ORG_STRUCTURE.planningManager.title,
      managerId: gm.id,
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
