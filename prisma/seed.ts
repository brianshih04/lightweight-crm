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

  console.log("🌱 Seeding Users...");
  const admin = await prisma.user.create({
    data: {
      name: "系統管理員 (Admin)",
      email: "admin@company.com",
      role: "ADMIN",
    },
  });

  const salesAlice = await prisma.user.create({
    data: {
      name: "張雅婷 (Alice)",
      email: "alice@company.com",
      role: "SALES",
    },
  });

  const salesBob = await prisma.user.create({
    data: {
      name: "李宗翰 (Bob)",
      email: "bob@company.com",
      role: "SALES",
    },
  });

  const mktCarol = await prisma.user.create({
    data: {
      name: "陳品妤 (Carol)",
      email: "carol@company.com",
      role: "MARKETING",
    },
  });

  const supportDavid = await prisma.user.create({
    data: {
      name: "王建宏 (David)",
      email: "david@company.com",
      role: "SUPPORT",
    },
  });

  console.log("🌱 Seeding Accounts...");
  const acc1 = await prisma.account.create({
    data: {
      name: "宏威智能科技股份有限公司",
      industry: "人工智慧 / 軟體開發",
      website: "https://www.hongwei-ai.example.com",
      phone: "02-2718-8888",
      address: "台北市內湖區瑞光路 500 號",
      customFields: JSON.stringify({ employeeCount: "150-200人", annualRevenue: "8000萬" }),
    },
  });

  const acc2 = await prisma.account.create({
    data: {
      name: "極光數據系統有限公司",
      industry: "雲端大數據",
      website: "https://aurora-data.example.com",
      phone: "03-571-9999",
      address: "新竹市東區公道五路二段 100 號",
      customFields: JSON.stringify({ employeeCount: "80人", annualRevenue: "4500萬" }),
    },
  });

  const acc3 = await prisma.account.create({
    data: {
      name: "鼎盛新零售供應鏈",
      industry: "電商與零售",
      website: "https://dingsheng-retail.example.com",
      phone: "04-2255-6677",
      address: "台中市西屯區台灣大道三段 300 號",
      customFields: JSON.stringify({ employeeCount: "300人", annualRevenue: "2.5億" }),
    },
  });

  const acc4 = await prisma.account.create({
    data: {
      name: "宇辰生醫科技",
      industry: "醫療健康 / 生技",
      website: "https://yuchen-bio.example.com",
      phone: "02-8792-3344",
      address: "台北市南港區園區街 3 號",
      customFields: JSON.stringify({ employeeCount: "50人", annualRevenue: "3000萬" }),
    },
  });

  console.log("🌱 Seeding Contacts...");
  const contact1 = await prisma.contact.create({
    data: {
      accountId: acc1.id,
      name: "林志遠",
      email: "chihyuan.lin@hongwei-ai.example.com",
      phone: "0912-345-678",
      title: "資訊長 (CIO)",
      tags: "VIP, 決策主管, 2026年會",
      customFields: JSON.stringify({ preferredContact: "Email", linkedIn: "https://linkedin.com/in/chihyuan" }),
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      accountId: acc1.id,
      name: "陳怡君",
      email: "yichun.chen@hongwei-ai.example.com",
      phone: "0928-111-222",
      title: "採購經理",
      tags: "採購窗口, 報價中",
    },
  });

  const contact3 = await prisma.contact.create({
    data: {
      accountId: acc2.id,
      name: "黃冠宇",
      email: "kuanyu.huang@aurora-data.example.com",
      phone: "0933-888-777",
      title: "技術總監 (CTO)",
      tags: "技術評估, 高意願",
    },
  });

  const contact4 = await prisma.contact.create({
    data: {
      accountId: acc3.id,
      name: "許佩芬",
      email: "peifen.hsu@dingsheng-retail.example.com",
      phone: "0955-666-333",
      title: "數位轉型協理",
      tags: "VIP, 企業大客戶",
    },
  });

  const contact5 = await prisma.contact.create({
    data: {
      accountId: acc4.id,
      name: "蔡政宏",
      email: "chenghong.tsai@yuchen-bio.example.com",
      phone: "0966-444-555",
      title: "營運副總",
      tags: "潛在客戶",
    },
  });

  console.log("🌱 Seeding Leads...");
  await prisma.lead.createMany({
    data: [
      {
        name: "周威宇",
        email: "weiyu.chou@smartlog.example.com",
        phone: "0977-123-456",
        company: "智流物聯網科技",
        source: "Website",
        status: "NEW",
        score: 75,
        notes: "官網填表預約系統 Demo，對 API 整合感興趣。",
        assignedToId: salesAlice.id,
      },
      {
        name: "劉曉萱",
        email: "hsiaohsuan.liu@nexus-media.example.com",
        phone: "0988-999-000",
        company: "銳思數位行銷",
        source: "Ads",
        status: "CONTACTED",
        score: 60,
        notes: "已電聯初次接洽，預計下週一提供產品資料。",
        assignedToId: salesBob.id,
      },
      {
        name: "郭子豪",
        email: "tzuhao.kuo@global-ship.example.com",
        phone: "0911-222-333",
        company: "環球運通物流",
        source: "Event",
        status: "QUALIFIED",
        score: 90,
        notes: "2026 數位科技展攤位接洽，預算充足，需求明確。",
        assignedToId: salesAlice.id,
      },
      {
        name: "葉建銘",
        email: "chienming.yeh@sunshine-edu.example.com",
        phone: "0922-333-444",
        company: "向陽數位教育",
        source: "Referral",
        status: "UNQUALIFIED",
        score: 30,
        notes: "規模過小，暫無企業 CRM 預算需求。",
        assignedToId: salesBob.id,
      },
    ],
  });

  console.log("🌱 Seeding Pipeline & Stages...");
  const pipeline = await prisma.pipeline.create({
    data: {
      name: "B2B 企業標準銷售管線",
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

  console.log("🌱 Seeding Deals...");
  const deal1 = await prisma.deal.create({
    data: {
      title: "宏威智能 - 全集團 CRM 系統建置案",
      value: 1200000,
      currency: "TWD",
      pipelineId: pipeline.id,
      stageId: stage4.id, // 商務談判
      contactId: contact1.id,
      accountId: acc1.id,
      assignedToId: salesAlice.id,
      status: "OPEN",
      expectedCloseDate: new Date(Date.now() + 15 * 86400000),
      notes: "已提交最終議價合約，預計月底前完成簽署。",
    },
  });

  const deal2 = await prisma.deal.create({
    data: {
      title: "極光數據 - 顧客數據平台 (CDP) 整合案",
      value: 680000,
      currency: "TWD",
      pipelineId: pipeline.id,
      stageId: stage3.id, // 方案報價
      contactId: contact3.id,
      accountId: acc2.id,
      assignedToId: salesBob.id,
      status: "OPEN",
      expectedCloseDate: new Date(Date.now() + 25 * 86400000),
      notes: "已寄送規格報價單，等候客戶內部審閱。",
    },
  });

  const deal3 = await prisma.deal.create({
    data: {
      title: "鼎盛新零售 - 全通路自動化客服模組",
      value: 1850000,
      currency: "TWD",
      pipelineId: pipeline.id,
      stageId: stage5.id, // 贏單
      contactId: contact4.id,
      accountId: acc3.id,
      assignedToId: salesAlice.id,
      status: "WON",
      expectedCloseDate: new Date(Date.now() - 5 * 86400000),
      notes: "合約已簽署完成，訂金已入帳！",
    },
  });

  const deal4 = await prisma.deal.create({
    data: {
      title: "宇辰生醫 - 會員忠誠度與行銷自動化系統",
      value: 450000,
      currency: "TWD",
      pipelineId: pipeline.id,
      stageId: stage2.id, // 需求確認
      contactId: contact5.id,
      accountId: acc4.id,
      assignedToId: salesBob.id,
      status: "OPEN",
      expectedCloseDate: new Date(Date.now() + 40 * 86400000),
      notes: "預計下週二進行第二次需求訪談與架構展示。",
    },
  });

  const deal5 = await prisma.deal.create({
    data: {
      title: "宏威智能 - AI 智能客服外掛模組擴充",
      value: 320000,
      currency: "TWD",
      pipelineId: pipeline.id,
      stageId: stage1.id, // 初次接洽
      contactId: contact2.id,
      accountId: acc1.id,
      assignedToId: salesAlice.id,
      status: "OPEN",
      expectedCloseDate: new Date(Date.now() + 60 * 86400000),
      notes: "客戶對 AI 自動回覆表現出濃厚興趣。",
    },
  });

  console.log("🌱 Seeding Customer Service Tickets...");
  const ticket1 = await prisma.ticket.create({
    data: {
      ticketNumber: "TICK-2026-001",
      subject: "API 權杖在換發時偶爾出現 401 授權逾時",
      description: "在我們自動排程更新 Token 時，每隔幾天會發生一次 401 錯誤，請協助排查金鑰刷新邏輯。",
      status: "IN_PROGRESS",
      priority: "HIGH",
      channel: "WEB",
      contactId: contact1.id,
      accountId: acc1.id,
      assignedToId: supportDavid.id,
      slaDueAt: new Date(Date.now() + 4 * 3600000),
      firstResponseAt: new Date(Date.now() - 2 * 3600000),
    },
  });

  await prisma.ticketMessage.createMany({
    data: [
      {
        ticketId: ticket1.id,
        senderName: "林志遠",
        senderType: "CUSTOMER",
        isInternal: false,
        content: "你好，我們今天上午 9:30 再次遇到 Token 401 錯誤，附上 log 檔案以供分析。",
      },
      {
        ticketId: ticket1.id,
        senderName: "王建宏 (David)",
        senderType: "AGENT",
        isInternal: true,
        content: "內部筆記：已向後端團隊確認，係因 Redis 叢集在自動備份時有 1 秒的瞬斷，正在佈署修補程式。",
      },
      {
        ticketId: ticket1.id,
        senderName: "王建宏 (David)",
        senderType: "AGENT",
        isInternal: false,
        content: "林 CIO 您好，我們已定位問題原因並正進行熱修復，預計今日下午 16:00 完成更新，完成後會立即向您通知。",
      },
    ],
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      ticketNumber: "TICK-2026-002",
      subject: "希望申請增加 5 組新進業務人員帳號授權",
      description: "鼎盛零售本季擴編銷售團隊，需加開 5 組帳號，請協助提供報價與開通流程。",
      status: "OPEN",
      priority: "MEDIUM",
      channel: "EMAIL",
      contactId: contact4.id,
      accountId: acc3.id,
      assignedToId: supportDavid.id,
      slaDueAt: new Date(Date.now() + 12 * 3600000),
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      ticketNumber: "TICK-2026-003",
      subject: "行銷 EDM 發送排程延遲約 15 分鐘",
      description: "昨晚預約 20:00 發送的優惠通知，系統至 20:15 才完成投遞，請確認發送佇列負載。",
      status: "RESOLVED",
      priority: "LOW",
      channel: "WEB",
      contactId: contact3.id,
      accountId: acc2.id,
      assignedToId: supportDavid.id,
      slaDueAt: new Date(Date.now() - 24 * 3600000),
      resolvedAt: new Date(Date.now() - 12 * 3600000),
    },
  });

  console.log("🌱 Seeding Activities & Timeline...");
  await prisma.activity.createMany({
    data: [
      {
        type: "NOTE",
        title: "宏威智能 CIO 線上會議紀要",
        content: "客戶預計於 Q3 啟動新系統導入，重點評估點為安全性及內部 ERP 串接彈性。",
        contactId: contact1.id,
        accountId: acc1.id,
        dealId: deal1.id,
        userId: salesAlice.id,
      },
      {
        type: "CALL",
        title: "極光數據報價確認電話",
        content: "與黃總監確認報價項目細節，對方同意報價方案，等待董事會批准。",
        contactId: contact3.id,
        accountId: acc2.id,
        dealId: deal2.id,
        userId: salesBob.id,
      },
      {
        type: "STAGE_CHANGE",
        title: "商機階段變更為「贏單 Won」",
        content: "鼎盛新零售成功簽約，合約總金額 $1,850,000 TWD。",
        contactId: contact4.id,
        accountId: acc3.id,
        dealId: deal3.id,
        userId: salesAlice.id,
      },
    ],
  });

  console.log("🌱 Seeding Marketing & Automation...");
  const segment1 = await prisma.segment.create({
    data: {
      name: "VIP 企業核心決策者",
      description: "標籤包含 VIP 且職稱為 CIO/CTO/副總之高價值聯絡人",
      filterType: "DYNAMIC",
      filterCriteria: JSON.stringify({ tag: "VIP", titleMatch: ["CIO", "CTO", "副總"] }),
      contactCount: 4,
    },
  });

  const segment2 = await prisma.segment.create({
    data: {
      name: "近 30 天新進潛在名單",
      description: "近一個月透過官網或展會取得之潛在線索與聯絡人",
      filterType: "DYNAMIC",
      filterCriteria: JSON.stringify({ createdWithinDays: 30 }),
      contactCount: 9,
    },
  });

  const template1 = await prisma.emailTemplate.create({
    data: {
      name: "新客戶尊榮歡迎信與產品手冊",
      subject: "歡迎加入 NexCRM - 為您的企業量身打造的成長引擎",
      bodyHtml: "<h2>親愛的 {{contact.name}} 您好：</h2><p>感謝您對 NexCRM 的關注與支持！我們隨信附上產品白皮書與快速入門指南...</p>",
      variables: "contact.name, contact.company, user.name",
    },
  });

  const template2 = await prisma.emailTemplate.create({
    data: {
      name: "2026 數位轉型研討會專屬邀請函",
      subject: "【專屬貴賓席】2026 企業 AI 與數據轉型高峰會",
      bodyHtml: "<h2>{{contact.name}} 貴賓您好：</h2><p>誠摯邀請您撥冗出席下月於台北舉辦的數位轉型閉門峰會...</p>",
      variables: "contact.name, contact.title",
    },
  });

  await prisma.campaign.create({
    data: {
      name: "2026 Q3 企業數位轉型方案推廣 EDM",
      channel: "EMAIL",
      status: "SENT",
      segmentId: segment1.id,
      templateId: template2.id,
      subject: "【專屬貴賓席】2026 企業 AI 與數據轉型高峰會",
      scheduledAt: new Date(Date.now() - 3 * 86400000),
      sentCount: 150,
      deliveredCount: 148,
      openedCount: 98,
      clickedCount: 45,
    },
  });

  await prisma.workflow.create({
    data: {
      name: "新 Lead 建立即時歡迎信與業務跟進任務",
      description: "當系統建立新線索時，自動發送歡迎信給客戶，並在 24 小時內指派業務聯絡任務。",
      triggerEvent: "NEW_LEAD",
      conditions: JSON.stringify({ scoreGte: 50 }),
      actions: JSON.stringify([
        { type: "SEND_EMAIL", templateId: template1.id },
        { type: "CREATE_TASK", title: "於 24 小時內電聯客戶確認需求", dueInHours: 24 },
      ]),
      isActive: true,
      executionCount: 12,
    },
  });

  await prisma.workflow.create({
    data: {
      name: "商機贏單自動建立專案售後工單",
      description: "當商機階段變更為「贏單 Won」時，自動通知客服團隊並建立導入開通工單。",
      triggerEvent: "DEAL_WON",
      conditions: JSON.stringify({ minDealValue: 500000 }),
      actions: JSON.stringify([
        { type: "CREATE_TICKET", subject: "新贏單客戶系統導入與帳號開通", priority: "HIGH" },
        { type: "NOTIFY_SLACK", channel: "#sales-wins" },
      ]),
      isActive: true,
      executionCount: 5,
    },
  });

  console.log("✅ Database successfully seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
