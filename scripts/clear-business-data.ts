/**
 * 清除所有示範／業務資料，僅保留：
 * - 人員結構（User：帳號、角色、區域、主管階層）
 * - 標準銷售管線與階段（Pipeline / Stage，系統運作必需的設定）
 * - 登入 Session、登入節流、工單序號與安全稽核事件
 *
 * 刪除：Activity、TicketMessage、Ticket、Deal、Lead、Contact、Account、
 *       WorkflowLog、Workflow、Campaign、EmailTemplate、Segment、IdempotencyRecord
 *
 * NODE_ENV=production 預設禁止執行；確定清除正式資料庫需另設
 * CLEAR_BUSINESS_DATA_ALLOW_PRODUCTION=1。
 *
 * 執行方式：npm run db:clear-business-data -- --confirm
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.argv.includes("--confirm")) {
    if (process.env.NODE_ENV === "production" && process.env.CLEAR_BUSINESS_DATA_ALLOW_PRODUCTION !== "1") {
      console.error("NODE_ENV=production 預設禁止執行清除；如確定要清除正式資料庫，另設 CLEAR_BUSINESS_DATA_ALLOW_PRODUCTION=1。");
      process.exit(1);
    }
  }

  const confirmed = process.argv.includes("--confirm");

  const before = {
    accounts: await prisma.account.count(),
    contacts: await prisma.contact.count(),
    leads: await prisma.lead.count(),
    deals: await prisma.deal.count(),
    activities: await prisma.activity.count(),
    tickets: await prisma.ticket.count(),
    ticketMessages: await prisma.ticketMessage.count(),
    campaigns: await prisma.campaign.count(),
    segments: await prisma.segment.count(),
    emailTemplates: await prisma.emailTemplate.count(),
    workflows: await prisma.workflow.count(),
    workflowLogs: await prisma.workflowLog.count(),
  };

  const kept = {
    users: await prisma.user.count(),
    pipelines: await prisma.pipeline.count(),
    stages: await prisma.stage.count(),
  };

  console.log("將刪除的示範業務資料：");
  for (const [key, value] of Object.entries(before)) {
    console.log(`  ${key}: ${value}`);
  }
  console.log("將保留的人員結構與設定：");
  for (const [key, value] of Object.entries(kept)) {
    console.log(`  ${key}: ${value}`);
  }

  if (!confirmed) {
    console.error("\n未執行刪除。確認後請加上 --confirm 重新執行：");
    console.error("  npm run db:clear-business-data -- --confirm");
    process.exit(1);
  }

  await prisma.$transaction([
    prisma.activity.deleteMany({}),
    prisma.ticketMessage.deleteMany({}),
    prisma.ticket.deleteMany({}),
    prisma.deal.deleteMany({}),
    prisma.lead.deleteMany({}),
    prisma.contact.deleteMany({}),
    prisma.account.deleteMany({}),
    prisma.workflowLog.deleteMany({}),
    prisma.workflow.deleteMany({}),
    prisma.campaign.deleteMany({}),
    prisma.emailTemplate.deleteMany({}),
    prisma.segment.deleteMany({}),
    // 一併清除冪等回應快取，避免 24 小時內重送舊 key 回放已刪除資源的結果
    prisma.idempotencyRecord.deleteMany({}),
  ]);

  console.log("\n✅ 已清除所有示範業務資料；人員結構、銷售管線、Session 與稽核記錄保持不變。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
