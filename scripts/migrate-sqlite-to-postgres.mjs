import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Prisma, PrismaClient } from "@prisma/client";

const sourceArgument = process.argv[2];
if (!sourceArgument) {
  throw new Error("Usage: node scripts/migrate-sqlite-to-postgres.mjs <source.db>");
}
if (!process.env.DATABASE_URL?.startsWith("postgresql://")) {
  throw new Error("DATABASE_URL must point to the target PostgreSQL database");
}
const targetUrl = new URL(process.env.DATABASE_URL);
const targetDatabase = targetUrl.pathname.slice(1);
const productionOverride = process.env.ALLOW_PRODUCTION_DATA_MIGRATION === "I_HAVE_A_VERIFIED_BACKUP";
if (!targetDatabase.endsWith("_test") && !productionOverride) {
  throw new Error("Production migration requires ALLOW_PRODUCTION_DATA_MIGRATION=I_HAVE_A_VERIFIED_BACKUP");
}

const sourcePath = resolve(process.cwd(), sourceArgument);
if (!sourcePath.endsWith(".db") || !existsSync(sourcePath)) {
  throw new Error(`SQLite source database not found: ${sourcePath}`);
}

const tableDefinitions = [
  ["User", "user", ["deletedAt", "createdAt", "updatedAt"], ["isActive"]],
  ["AuthSession", "authSession", ["expiresAt", "lastSeenAt", "revokedAt", "createdAt"], []],
  ["LoginThrottle", "loginThrottle", ["windowStartedAt", "blockedUntil", "updatedAt"], []],
  ["IdempotencyRecord", "idempotencyRecord", ["expiresAt", "createdAt", "updatedAt"], []],
  ["TicketSequence", "ticketSequence", ["updatedAt"], []],
  ["AuditEvent", "auditEvent", ["createdAt"], []],
  ["Account", "account", ["createdAt", "updatedAt"], []],
  ["Contact", "contact", ["createdAt", "updatedAt"], []],
  ["Lead", "lead", ["createdAt", "updatedAt"], []],
  ["Pipeline", "pipeline", ["createdAt", "updatedAt"], ["isDefault"]],
  ["Stage", "stage", ["createdAt", "updatedAt"], []],
  ["Deal", "deal", ["expectedCloseDate", "createdAt", "updatedAt"], []],
  ["Segment", "segment", ["createdAt", "updatedAt"], []],
  ["EmailTemplate", "emailTemplate", ["createdAt", "updatedAt"], []],
  ["Campaign", "campaign", ["scheduledAt", "createdAt", "updatedAt"], []],
  ["Workflow", "workflow", ["createdAt", "updatedAt"], ["isActive"]],
  ["WorkflowLog", "workflowLog", ["executedAt"], []],
  ["Ticket", "ticket", ["slaDueAt", "firstResponseAt", "resolvedAt", "createdAt", "updatedAt"], []],
  ["TicketMessage", "ticketMessage", ["createdAt"], ["isInternal"]],
  ["Activity", "activity", ["dueDate", "createdAt"], ["isCompleted"]],
];

function transformRow(row, dateFields, booleanFields) {
  const result = { ...row };
  for (const field of dateFields) {
    if (result[field] !== null && result[field] !== undefined) result[field] = new Date(result[field]);
  }
  for (const field of booleanFields) result[field] = Boolean(result[field]);
  if ("value" in result && result.value !== null) result.value = String(result.value);
  return result;
}

function batches(rows, size = 500) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) result.push(rows.slice(index, index + size));
  return result;
}

const sqlite = new DatabaseSync(sourcePath, { readOnly: true });
const postgres = new PrismaClient();

try {
  const sourceRows = new Map();
  for (const [table, , dateFields, booleanFields] of tableDefinitions) {
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all()
      .map((row) => transformRow(row, dateFields, booleanFields));
    sourceRows.set(table, rows);
  }
  const legacyPasswordCount = sourceRows.get("User")
    .filter((user) => typeof user.password !== "string" || !user.password.startsWith("scrypt$")).length;
  if (legacyPasswordCount > 0) {
    throw new Error(`Refusing to migrate ${legacyPasswordCount} legacy plaintext password record(s); run npm run db:passwords:upgrade first`);
  }

  await postgres.$transaction(async (tx) => {
    for (const [, delegateName] of tableDefinitions) {
      if (await tx[delegateName].count() !== 0) {
        throw new Error(`Target PostgreSQL table ${delegateName} is not empty`);
      }
    }

    for (const [table, delegateName] of tableDefinitions) {
      let rows = sourceRows.get(table);
      const managerIds = table === "User"
        ? rows.filter((row) => row.managerId).map((row) => ({ id: row.id, managerId: row.managerId }))
        : [];
      if (table === "User") rows = rows.map((row) => ({ ...row, managerId: null }));
      for (const batch of batches(rows)) {
        if (batch.length) await tx[delegateName].createMany({ data: batch });
      }
      for (const manager of managerIds) {
        await tx.user.update({ where: { id: manager.id }, data: { managerId: manager.managerId } });
      }
    }
  }, { maxWait: 60_000, timeout: 600_000 });

  const summary = {};
  for (const [table, delegateName] of tableDefinitions) {
    const sourceCount = sourceRows.get(table).length;
    const targetCount = await postgres[delegateName].count();
    if (targetCount !== sourceCount) throw new Error(`${table} count mismatch: ${sourceCount} -> ${targetCount}`);
    summary[table] = targetCount;
  }
  const sourceDealTotal = sourceRows.get("Deal").reduce(
    (total, deal) => total.add(deal.value),
    new Prisma.Decimal(0)
  );
  const targetDealTotal = (await postgres.deal.aggregate({ _sum: { value: true } }))._sum.value
    || new Prisma.Decimal(0);
  if (!sourceDealTotal.equals(targetDealTotal)) {
    throw new Error(`Deal total mismatch: ${sourceDealTotal.toString()} -> ${targetDealTotal.toString()}`);
  }
  const targetLegacyPasswords = await postgres.user.count({
    where: { NOT: { password: { startsWith: "scrypt$" } } },
  });
  if (targetLegacyPasswords !== 0) throw new Error("Target contains a legacy password record");
  console.log(`SQLite to PostgreSQL migration PASS: ${JSON.stringify(summary)}`);
} finally {
  sqlite.close();
  await postgres.$disconnect();
}
