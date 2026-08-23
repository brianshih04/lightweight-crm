import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(projectRoot, "prisma", "schema.prisma");
const targetPath = join(projectRoot, "prisma", "postgresql", "schema.prisma");

const enumBlock = `
enum UserRole {
  ADMIN
  GM
  MARKETING_MANAGER
  SALES_MANAGER
  SALES
  ORDER_ADMIN
  MARKETING
  SUPPORT
}

enum UserRegion {
  ALL
  NORTH
  CENTRAL
  SOUTH
  OVERSEAS
}

enum DataRegion {
  NORTH
  CENTRAL
  SOUTH
  OVERSEAS
}

enum AuditResult {
  SUCCESS
  DENIED
  FAILURE
}

enum LeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  UNQUALIFIED
  CONVERTED
}

enum DealStatus {
  OPEN
  WON
  LOST
}

enum ActivityType {
  NOTE
  CALL
  EMAIL
  MEETING
  STAGE_CHANGE
  TASK
  SYSTEM
}

enum SegmentFilterType {
  STATIC
  DYNAMIC
}

enum CampaignChannel {
  EMAIL
  SMS
  WEBHOOK
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  CANCELLED
}

enum WorkflowTriggerEvent {
  NEW_LEAD
  DEAL_WON
  TICKET_CREATED
  FORM_SUBMIT
}

enum WorkflowLogStatus {
  SUCCESS
  FAILED
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  PENDING
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketChannel {
  EMAIL
  WEB
  PHONE
  CHAT
}

enum TicketSenderType {
  AGENT
  CUSTOMER
}
`;

function replaceExactlyOnce(source, before, after) {
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0 || first !== last) {
    throw new Error(`Expected exactly one schema fragment: ${JSON.stringify(before)}`);
  }
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
}

function generate() {
  let schema = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");
  schema = replaceExactlyOnce(
    schema,
    'datasource db {\n  provider = "sqlite"\n  url      = env("DATABASE_URL")\n}',
    'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}'
  );
  schema = replaceExactlyOnce(schema, "\n\nmodel User {", `${enumBlock}\nmodel User {`);

  const replacements = [
    ['  role       String   @default("SALES") // ADMIN, GM, MARKETING_MANAGER, SALES_MANAGER, SALES, ORDER_ADMIN, MARKETING, SUPPORT', "  role       UserRole   @default(SALES)"],
    ['  region     String   @default("NORTH") // ALL (全區), NORTH (北部), CENTRAL (中部), SOUTH (南部), OVERSEAS (海外)', "  region     UserRegion @default(NORTH)"],
    ["  result        String", "  result        AuditResult"],
    ['  status       String   @default("NEW") // NEW, CONTACTED, QUALIFIED, UNQUALIFIED, CONVERTED', "  status       LeadStatus @default(NEW)"],
    ['  status            String    @default("OPEN") // OPEN, WON, LOST', "  status            DealStatus @default(OPEN)"],
    ["  type        String // NOTE, CALL, EMAIL, MEETING, STAGE_CHANGE, TASK, SYSTEM", "  type        ActivityType"],
    ['  filterType     String   @default("DYNAMIC") // STATIC, DYNAMIC', "  filterType     SegmentFilterType @default(DYNAMIC)"],
    ['  channel        String    @default("EMAIL") // EMAIL, SMS, WEBHOOK', "  channel        CampaignChannel @default(EMAIL)"],
    ['  status         String    @default("DRAFT") // DRAFT, SCHEDULED, SENDING, SENT, CANCELLED', "  status         CampaignStatus @default(DRAFT)"],
    ["  triggerEvent   String // NEW_LEAD, DEAL_WON, TICKET_CREATED, FORM_SUBMIT", "  triggerEvent   WorkflowTriggerEvent"],
    ['  status      String   @default("SUCCESS") // SUCCESS, FAILED', "  status      WorkflowLogStatus @default(SUCCESS)"],
    ['  status          String    @default("OPEN") // OPEN, IN_PROGRESS, PENDING, RESOLVED, CLOSED', "  status          TicketStatus @default(OPEN)"],
    ['  priority        String    @default("MEDIUM") // LOW, MEDIUM, HIGH, URGENT', "  priority        TicketPriority @default(MEDIUM)"],
    ['  channel         String    @default("WEB") // EMAIL, WEB, PHONE, CHAT', "  channel         TicketChannel @default(WEB)"],
    ['  senderType String   @default("AGENT") // AGENT, CUSTOMER', "  senderType TicketSenderType @default(AGENT)"],
  ];
  for (const [before, after] of replacements) schema = replaceExactlyOnce(schema, before, after);

  const dataRegionLine = '  region       String   @default("NORTH") // NORTH, CENTRAL, SOUTH, OVERSEAS';
  const dealRegionLine = '  region            String    @default("NORTH") // NORTH, CENTRAL, SOUTH, OVERSEAS';
  const ticketRegionLine = '  region          String    @default("NORTH") // NORTH, CENTRAL, SOUTH, OVERSEAS';
  if (schema.split(dataRegionLine).length - 1 !== 3) {
    throw new Error("Expected exactly three Account/Contact/Lead region fields");
  }
  schema = schema.split(dataRegionLine).join("  region       DataRegion @default(NORTH)");
  schema = replaceExactlyOnce(schema, dealRegionLine, "  region            DataRegion @default(NORTH)");
  schema = replaceExactlyOnce(schema, ticketRegionLine, "  region          DataRegion @default(NORTH)");

  return `// GENERATED by scripts/generate-postgres-schema.mjs. Do not edit directly.\n${schema}`;
}

const generated = generate();
if (process.argv.includes("--check")) {
  if (!existsSync(targetPath) || readFileSync(targetPath, "utf8").replace(/\r\n/g, "\n") !== generated) {
    console.error("PostgreSQL Prisma schema is stale. Run: npm run db:pg:schema");
    process.exit(1);
  }
  console.log("PostgreSQL Prisma schema is synchronized.");
} else {
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, generated, "utf8");
  console.log(`Generated ${targetPath}`);
}
