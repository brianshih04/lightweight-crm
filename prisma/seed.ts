import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
  await prisma.user.deleteMany({});

  console.log("🌱 Seeding Multi-User Hierarchy & Passwords...");
  // 1. General Manager (總經理) - Admin & Full Access
  const gmUser = await prisma.user.create({
    data: {
      username: "admin",
      password: "Avi22099759",
      name: "柯博文 (Peter)",
      email: "peter.gm@company.com",
      role: "GM",
      department: "總經理室",
      region: "ALL",
      title: "總經理 (CEO / GM)",
    },
  });

  // 2. Regional Sales Manager (北部業務主管)
  const salesNorthMgr = await prisma.user.create({
    data: {
      username: "alice_mgr",
      password: "alice123",
      name: "張雅婷 (Alice)",
      email: "alice.sales@company.com",
      role: "SALES_MANAGER",
      department: "業務部",
      region: "NORTH",
      title: "北部業務處主管",
      managerId: gmUser.id,
    },
  });

  // 3. Subordinate Sales Reps
  const salesNorthRep = await prisma.user.create({
    data: {
      username: "kevin_sales",
      password: "kevin123",
      name: "林凱文 (Kevin)",
      email: "kevin.sales@company.com",
      role: "SALES",
      department: "業務部",
      region: "NORTH",
      title: "北部業務代表",
      managerId: salesNorthMgr.id,
    },
  });

  const salesCentral = await prisma.user.create({
    data: {
      username: "bob_sales",
      password: "bob123",
      name: "李宗翰 (Bob)",
      email: "bob.sales@company.com",
      role: "SALES",
      department: "業務部",
      region: "CENTRAL",
      title: "中部資深業務經理",
      managerId: gmUser.id,
    },
  });

  const salesSouth = await prisma.user.create({
    data: {
      username: "charlie_sales",
      password: "charlie123",
      name: "趙冠宇 (Charlie)",
      email: "charlie.sales@company.com",
      role: "SALES",
      department: "業務部",
      region: "SOUTH",
      title: "南部業務代表",
      managerId: gmUser.id,
    },
  });

  const salesOverseas = await prisma.user.create({
    data: {
      username: "sophia_sales",
      password: "sophia123",
      name: "孫佩華 (Sophia)",
      email: "sophia.overseas@company.com",
      role: "SALES",
      department: "海外事業部",
      region: "OVERSEAS",
      title: "海外亞太區商務代表",
      managerId: gmUser.id,
    },
  });

  // 4. Marketing & Customer Support
  const mktCarol = await prisma.user.create({
    data: {
      username: "carol_mkt",
      password: "carol123",
      name: "陳品妤 (Carol)",
      email: "carol.mkt@company.com",
      role: "MARKETING",
      department: "行銷部",
      region: "ALL",
      title: "行銷企劃主管",
    },
  });

  const supportDavid = await prisma.user.create({
    data: {
      username: "david_support",
      password: "david123",
      name: "王建宏 (David)",
      email: "david.support@company.com",
      role: "SUPPORT",
      department: "客戶服務部",
      region: "ALL",
      title: "客服支援組長",
    },
  });

  console.log("🌱 Seeding Regional Accounts...");
  const accNorth1 = await prisma.account.create({
    data: {
      name: "宏威智能科技股份有限公司",
      industry: "人工智慧 / 軟體開發",
      region: "NORTH",
      website: "https://www.hongwei-ai.example.com",
      phone: "02-2718-8888",
      address: "台北市內湖區瑞光路 500 號",
      customFields: JSON.stringify({ employeeCount: "180人", annualRevenue: "8000萬" }),
    },
  });

  const accNorth2 = await prisma.account.create({
    data: {
      name: "極光數據系統有限公司",
      industry: "雲端大數據",
      region: "NORTH",
      website: "https://aurora-data.example.com",
      phone: "03-571-9999",
      address: "新竹市東區公道五路二段 100 號",
      customFields: JSON.stringify({ employeeCount: "80人", annualRevenue: "4500萬" }),
    },
  });

  const accCentral1 = await prisma.account.create({
    data: {
      name: "鼎盛新零售供應鏈",
      industry: "電商與零售",
      region: "CENTRAL",
      website: "https://dingsheng-retail.example.com",
      phone: "04-2255-6677",
      address: "台中市西屯區台灣大道三段 300 號",
      customFields: JSON.stringify({ employeeCount: "320人", annualRevenue: "2.5億" }),
    },
  });

  const accSouth1 = await prisma.account.create({
    data: {
      name: "南光精密工業",
      industry: "智慧製造 / 半導體設備",
      region: "SOUTH",
      website: "https://nanguang-precision.example.com",
      phone: "07-812-3344",
      address: "高雄市前鎮區成功二路 25 號",
      customFields: JSON.stringify({ employeeCount: "500人", annualRevenue: "4.8億" }),
    },
  });

  const accOverseas1 = await prisma.account.create({
    data: {
      name: "SingaTech Global Pte Ltd",
      industry: "跨境金融科技 (FinTech)",
      region: "OVERSEAS",
      website: "https://singatech.sg.example.com",
      phone: "+65 6789 0123",
      address: "Marina Bay Financial Centre Tower 1, Singapore",
      customFields: JSON.stringify({ employeeCount: "250人", annualRevenue: "1200萬 USD" }),
    },
  });

  console.log("🌱 Seeding Regional Contacts...");
  const contact1 = await prisma.contact.create({
    data: {
      accountId: accNorth1.id,
      name: "林志遠",
      email: "chihyuan.lin@hongwei-ai.example.com",
      phone: "0912-345-678",
      title: "資訊長 (CIO)",
      region: "NORTH",
      tags: "VIP, 決策主管, 北部主力",
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      accountId: accNorth2.id,
      name: "黃冠宇",
      email: "kuanyu.huang@aurora-data.example.com",
      phone: "0933-888-777",
      title: "技術總監 (CTO)",
      region: "NORTH",
      tags: "技術窗口, 新竹高科技",
    },
  });

  const contact3 = await prisma.contact.create({
    data: {
      accountId: accCentral1.id,
      name: "許佩芬",
      email: "peifen.hsu@dingsheng-retail.example.com",
      phone: "0955-666-333",
      title: "數位轉型協理",
      region: "CENTRAL",
      tags: "VIP, 中部旗艦客戶",
    },
  });

  const contact4 = await prisma.contact.create({
    data: {
      accountId: accSouth1.id,
      name: "郭耀廷",
      email: "yaoting.kuo@nanguang.example.com",
      phone: "0977-888-999",
      title: "製造營運副總",
      region: "SOUTH",
      tags: "南部VIP, 高雄大廠",
    },
  });

  const contact5 = await prisma.contact.create({
    data: {
      accountId: accOverseas1.id,
      name: "Michael Tan",
      email: "michael.tan@singatech.sg.example.com",
      phone: "+65 9123 4567",
      title: "Head of Digital Operations",
      region: "OVERSEAS",
      tags: "新加坡, 亞太外商",
    },
  });

  console.log("🌱 Seeding Regional Leads...");
  await prisma.lead.createMany({
    data: [
      {
        name: "周威宇",
        company: "智流物聯網科技 (台北)",
        email: "weiyu@smartlog.example.com",
        region: "NORTH",
        source: "Website",
        status: "NEW",
        score: 75,
        assignedToId: salesNorthRep.id,
      },
      {
        name: "劉曉萱",
        company: "台中銳思數位",
        email: "hsiaohsuan@nexus.example.com",
        region: "CENTRAL",
        source: "Ads",
        status: "CONTACTED",
        score: 60,
        assignedToId: salesCentral.id,
      },
      {
        name: "林建勳",
        company: "台南晶準光學",
        email: "chienhsun@optics.example.com",
        region: "SOUTH",
        source: "Event",
        status: "QUALIFIED",
        score: 85,
        assignedToId: salesSouth.id,
      },
      {
        name: "Derek Wong",
        company: "Pacific Horizons Tokyo",
        email: "derek@pacific.jp.example.com",
        region: "OVERSEAS",
        source: "Referral",
        status: "NEW",
        score: 90,
        assignedToId: salesOverseas.id,
      },
    ],
  });

  console.log("🌱 Seeding Pipeline & Stages...");
  const pipeline = await prisma.pipeline.create({
    data: {
      name: "標準企業銷售管線 (全區共用)",
      isDefault: true,
    },
  });

  const stage1 = await prisma.stage.create({
    data: { pipelineId: pipeline.id, name: "初次接洽", order: 1, color: "#3b82f6", probability: 10 },
  });
  const stage2 = await prisma.stage.create({
    data: { pipelineId: pipeline.id, name: "需求確認", order: 2, color: "#6366f1", probability: 30 },
  });
  const stage3 = await prisma.stage.create({
    data: { pipelineId: pipeline.id, name: "方案報價", order: 3, color: "#eab308", probability: 60 },
  });
  const stage4 = await prisma.stage.create({
    data: { pipelineId: pipeline.id, name: "商務談判", order: 4, color: "#a855f7", probability: 80 },
  });
  const stage5 = await prisma.stage.create({
    data: { pipelineId: pipeline.id, name: "贏單 Won", order: 5, color: "#10b981", probability: 100 },
  });
  const stage6 = await prisma.stage.create({
    data: { pipelineId: pipeline.id, name: "輸單 Lost", order: 6, color: "#ef4444", probability: 0 },
  });

  console.log("🌱 Seeding Regional Deals assigned to specific Sales...");
  // North Deals (Assigned to Alice & Kevin)
  await prisma.deal.create({
    data: {
      title: "宏威智能 - 全集團 CRM 系統建置案",
      value: 1200000,
      currency: "TWD",
      region: "NORTH",
      pipelineId: pipeline.id,
      stageId: stage4.id,
      contactId: contact1.id,
      accountId: accNorth1.id,
      assignedToId: salesNorthMgr.id,
      status: "OPEN",
      expectedCloseDate: new Date(Date.now() + 15 * 86400000),
    },
  });

  await prisma.deal.create({
    data: {
      title: "極光數據 - CDP 顧客數據平台導入案",
      value: 680000,
      currency: "TWD",
      region: "NORTH",
      pipelineId: pipeline.id,
      stageId: stage3.id,
      contactId: contact2.id,
      accountId: accNorth2.id,
      assignedToId: salesNorthRep.id,
      status: "OPEN",
      expectedCloseDate: new Date(Date.now() + 25 * 86400000),
    },
  });

  // Central Deals
  await prisma.deal.create({
    data: {
      title: "鼎盛新零售 - 全通路自動化客服模組",
      value: 1850000,
      currency: "TWD",
      region: "CENTRAL",
      pipelineId: pipeline.id,
      stageId: stage5.id,
      contactId: contact3.id,
      accountId: accCentral1.id,
      assignedToId: salesCentral.id,
      status: "WON",
      expectedCloseDate: new Date(Date.now() - 5 * 86400000),
    },
  });

  await prisma.deal.create({
    data: {
      title: "台中精機 - 業務 CRM 看板客製化案",
      value: 520000,
      currency: "TWD",
      region: "CENTRAL",
      pipelineId: pipeline.id,
      stageId: stage2.id,
      contactId: contact3.id,
      accountId: accCentral1.id,
      assignedToId: salesCentral.id,
      status: "OPEN",
      expectedCloseDate: new Date(Date.now() + 35 * 86400000),
    },
  });

  // South Deals
  await prisma.deal.create({
    data: {
      title: "南光精密 - 工廠售後維修工單系統",
      value: 2100000,
      currency: "TWD",
      region: "SOUTH",
      pipelineId: pipeline.id,
      stageId: stage4.id,
      contactId: contact4.id,
      accountId: accSouth1.id,
      assignedToId: salesSouth.id,
      status: "OPEN",
      expectedCloseDate: new Date(Date.now() + 10 * 86400000),
    },
  });

  await prisma.deal.create({
    data: {
      title: "高雄港灣物流 - 行銷自動化推播模組",
      value: 950000,
      currency: "TWD",
      region: "SOUTH",
      pipelineId: pipeline.id,
      stageId: stage5.id,
      contactId: contact4.id,
      accountId: accSouth1.id,
      assignedToId: salesSouth.id,
      status: "WON",
      expectedCloseDate: new Date(Date.now() - 8 * 86400000),
    },
  });

  // Overseas Deals
  await prisma.deal.create({
    data: {
      title: "SingaTech - 亞太區跨國銷售管線整合",
      value: 3600000,
      currency: "TWD",
      region: "OVERSEAS",
      pipelineId: pipeline.id,
      stageId: stage3.id,
      contactId: contact5.id,
      accountId: accOverseas1.id,
      assignedToId: salesOverseas.id,
      status: "OPEN",
      expectedCloseDate: new Date(Date.now() + 45 * 86400000),
    },
  });

  console.log("🌱 Seeding Regional Tickets...");
  await prisma.ticket.create({
    data: {
      ticketNumber: "TICK-2026-001",
      subject: "台北總部 API 權杖刷新 401 異常",
      description: "定期金鑰自動換發偶發 401 錯誤，需後端熱修補。",
      status: "IN_PROGRESS",
      priority: "HIGH",
      region: "NORTH",
      contactId: contact1.id,
      accountId: accNorth1.id,
      assignedToId: supportDavid.id,
      slaDueAt: new Date(Date.now() + 4 * 3600000),
    },
  });

  await prisma.ticket.create({
    data: {
      ticketNumber: "TICK-2026-002",
      subject: "台中零售新進 5 組業務帳號開通",
      description: "本季業務擴編需加開授權帳號。",
      status: "OPEN",
      priority: "MEDIUM",
      region: "CENTRAL",
      contactId: contact3.id,
      accountId: accCentral1.id,
      assignedToId: supportDavid.id,
      slaDueAt: new Date(Date.now() + 12 * 3600000),
    },
  });

  console.log("✅ Authenticated users & regional data seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
