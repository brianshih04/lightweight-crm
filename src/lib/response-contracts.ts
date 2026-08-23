import { z } from "zod";

const finiteNumber = z.preprocess((value) => {
  if (value && typeof value === "object" && "toNumber" in value) {
    const toNumber = (value as { toNumber?: unknown }).toNumber;
    if (typeof toNumber === "function") return toNumber.call(value);
  }
  return value;
}, z.number().finite());
const nullableString = z.string().nullable();
const nullableDate = z.date().nullable();

export const successResponseSchema = z.object({ success: z.literal(true) });

export const sessionUserResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  department: z.string(),
  region: z.string(),
  title: z.string(),
  managerId: nullableString.optional(),
  mustChangePassword: z.boolean().optional(),
});

export const publicUserResponseSchema = sessionUserResponseSchema.extend({
  avatar: nullableString,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const userSummaryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  region: z.string(),
});

export const accountResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: nullableString,
  region: z.string(),
  website: nullableString,
  phone: nullableString,
  address: nullableString,
  customFields: nullableString,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const contactResponseSchema = z.object({
  id: z.string(),
  accountId: nullableString,
  name: z.string(),
  email: nullableString,
  phone: nullableString,
  title: nullableString,
  region: z.string(),
  avatar: nullableString,
  tags: nullableString,
  customFields: nullableString,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const leadResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: nullableString,
  phone: nullableString,
  company: nullableString,
  region: z.string(),
  source: z.string(),
  status: z.string(),
  score: z.number().int(),
  notes: nullableString,
  assignedToId: nullableString,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const pipelineResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const stageResponseSchema = z.object({
  id: z.string(),
  pipelineId: z.string(),
  name: z.string(),
  order: z.number().int(),
  color: z.string(),
  probability: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const dealResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  value: finiteNumber,
  currency: z.string(),
  region: z.string(),
  pipelineId: z.string(),
  stageId: z.string(),
  contactId: nullableString,
  accountId: nullableString,
  assignedToId: nullableString,
  status: z.string(),
  expectedCloseDate: nullableDate,
  notes: nullableString,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const activityResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  content: nullableString,
  contactId: nullableString,
  accountId: nullableString,
  dealId: nullableString,
  ticketId: nullableString,
  userId: nullableString,
  dueDate: nullableDate,
  isCompleted: z.boolean(),
  createdAt: z.date(),
});

export const segmentResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: nullableString,
  filterType: z.string(),
  filterCriteria: nullableString,
  contactCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const emailTemplateResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  bodyHtml: z.string(),
  variables: nullableString,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const campaignResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  channel: z.string(),
  status: z.string(),
  segmentId: nullableString,
  templateId: nullableString,
  subject: nullableString,
  content: nullableString,
  scheduledAt: nullableDate,
  sentCount: z.number().int(),
  deliveredCount: z.number().int(),
  openedCount: z.number().int(),
  clickedCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const workflowResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: nullableString,
  triggerEvent: z.string(),
  conditions: nullableString,
  actions: z.string(),
  isActive: z.boolean(),
  executionCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const workflowLogResponseSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  triggerData: nullableString,
  status: z.string(),
  errorMsg: nullableString,
  executedAt: z.date(),
});

export const ticketResponseSchema = z.object({
  id: z.string(),
  ticketNumber: z.string(),
  subject: z.string(),
  description: z.string(),
  status: z.string(),
  priority: z.string(),
  channel: z.string(),
  region: z.string(),
  contactId: nullableString,
  accountId: nullableString,
  assignedToId: nullableString,
  slaDueAt: nullableDate,
  firstResponseAt: nullableDate,
  resolvedAt: nullableDate,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ticketMessageResponseSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  senderId: nullableString,
  senderName: z.string(),
  senderType: z.string(),
  isInternal: z.boolean(),
  content: z.string(),
  createdAt: z.date(),
});

export const auditEventResponseSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  actorId: nullableString,
  actorUsername: nullableString,
  action: z.string(),
  resource: z.string(),
  resourceId: nullableString,
  result: z.enum(["SUCCESS", "DENIED", "FAILURE"]),
  ipHash: nullableString,
  details: z.unknown().nullable(),
  createdAt: z.date(),
});

export const accountListItemResponseSchema = accountResponseSchema.extend({
  contactCount: z.number().int().nonnegative(),
  totalDealValue: finiteNumber,
});

export const contactListItemResponseSchema = contactResponseSchema.extend({
  account: accountResponseSchema.nullable(),
  dealCount: z.number().int().nonnegative(),
  ticketCount: z.number().int().nonnegative(),
});

export const contactDetailResponseSchema = contactResponseSchema.extend({
  account: accountResponseSchema.nullable(),
  dealCount: z.number().int().nonnegative(),
  ticketCount: z.number().int().nonnegative(),
  activityCount: z.number().int().nonnegative(),
});

export const contactDealResponseSchema = dealResponseSchema.extend({ stage: stageResponseSchema });
export const contactActivityResponseSchema = activityResponseSchema.extend({
  user: publicUserResponseSchema.nullable(),
});

export const contactWithAccountResponseSchema = contactResponseSchema.extend({
  account: accountResponseSchema.nullable(),
});

export const leadListItemResponseSchema = leadResponseSchema.extend({
  assignedTo: publicUserResponseSchema.nullable(),
});

export const dealWithRelationsResponseSchema = dealResponseSchema.extend({
  stage: stageResponseSchema,
  contact: contactResponseSchema.nullable(),
  account: accountResponseSchema.nullable(),
  assignedTo: publicUserResponseSchema.nullable(),
});

export const dealUpdateResponseSchema = dealResponseSchema.extend({
  stage: stageResponseSchema,
  contact: contactResponseSchema.nullable(),
});

const pipelineWithDealsResponseSchema = pipelineResponseSchema.extend({
  stages: z.array(stageResponseSchema.extend({ deals: z.array(dealWithRelationsResponseSchema) })),
});

export const dealsOverviewResponseSchema = z.object({
  currentUser: sessionUserResponseSchema,
  isGMOrAdmin: z.boolean(),
  pipelines: z.array(pipelineWithDealsResponseSchema),
  activePipeline: pipelineWithDealsResponseSchema.optional(),
});

export const ticketWithCustomerResponseSchema = ticketResponseSchema.extend({
  contact: contactResponseSchema.nullable(),
  account: accountResponseSchema.nullable(),
});

export const ticketListItemResponseSchema = ticketWithCustomerResponseSchema.extend({
  assignedTo: publicUserResponseSchema.nullable(),
  messages: z.array(ticketMessageResponseSchema),
});

export const ticketDetailResponseSchema = ticketWithCustomerResponseSchema.extend({
  assignedTo: publicUserResponseSchema.nullable(),
  messages: z.array(ticketMessageResponseSchema),
});

export const userResponseSchema = publicUserResponseSchema.extend({
  manager: userSummaryResponseSchema.nullable(),
});

export const userListItemResponseSchema = userResponseSchema.extend({
  subordinates: z.array(userSummaryResponseSchema),
  assignedDeals: z.array(z.object({
    id: z.string(),
    value: finiteNumber,
    status: z.string(),
  })),
});

export const campaignWithRelationsResponseSchema = campaignResponseSchema.extend({
  segment: segmentResponseSchema.nullable(),
  template: emailTemplateResponseSchema.nullable(),
});

export const campaignsOverviewResponseSchema = z.object({
  campaigns: z.array(campaignWithRelationsResponseSchema),
  segments: z.array(segmentResponseSchema),
  templates: z.array(emailTemplateResponseSchema),
});

export const workflowWithLogsResponseSchema = workflowResponseSchema.extend({
  logs: z.array(workflowLogResponseSchema),
});

export const authenticatedResponseSchema = z.object({
  success: z.literal(true),
  user: sessionUserResponseSchema,
});

export const authStateResponseSchema = z.discriminatedUnion("authenticated", [
  z.object({ authenticated: z.literal(false), user: z.null() }),
  z.object({ authenticated: z.literal(true), user: sessionUserResponseSchema }),
]);

export const setupStateResponseSchema = z.object({ needsSetup: z.boolean() });

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  database: z.literal("ok"),
  timestamp: z.date(),
});

export const leadConversionResponseSchema = z.object({
  success: z.literal(true),
  contact: contactResponseSchema,
  account: accountResponseSchema.nullable(),
  deal: dealResponseSchema.nullable(),
});

export const auditPageResponseSchema = z.object({
  items: z.array(auditEventResponseSchema),
  nextCursor: nullableString,
});

const securityResultCountsResponseSchema = z.object({
  success: z.number().int().nonnegative(),
  denied: z.number().int().nonnegative(),
  failure: z.number().int().nonnegative(),
});

export const securitySummaryResponseSchema = z.object({
  generatedAt: z.date(),
  last24h: securityResultCountsResponseSchema,
  last15m: securityResultCountsResponseSchema,
  activeLoginBlocks: z.number().int().nonnegative(),
  topSources15m: z.array(z.object({
    ipHash: z.string().length(64),
    count: z.number().int().positive(),
  })).max(10),
  status: z.enum(["OK", "WARNING", "CRITICAL"]),
  alerts: z.array(z.object({
    code: z.enum(["AUDIT_FAILURES", "DENIAL_SPIKE", "LOGIN_BLOCKS", "REPEATED_SOURCE"]),
    severity: z.enum(["WARNING", "CRITICAL"]),
    count: z.number().int().positive(),
    windowMinutes: z.number().int().positive().nullable(),
    ipHash: z.string().length(64).nullable(),
  })),
});

export const dashboardResponseSchema = z.object({
  currentUser: sessionUserResponseSchema,
  isGMOrAdmin: z.boolean(),
  kpis: z.object({
    totalContacts: z.number().int(),
    totalAccounts: z.number().int(),
    openDealsCount: z.number().int(),
    totalPipelineValue: finiteNumber,
    wonValue: finiteNumber,
    winRate: finiteNumber,
    openTicketsCount: z.number().int(),
  }),
  pipelineStages: z.array(z.object({
    name: z.string(),
    color: z.string(),
    count: z.number().int(),
    totalValue: finiteNumber,
  })),
  openTickets: z.array(ticketWithCustomerResponseSchema),
  sentCampaigns: z.array(campaignResponseSchema),
  activities: z.array(activityResponseSchema.extend({
    contact: contactResponseSchema.nullable(),
    deal: dealResponseSchema.nullable(),
    user: publicUserResponseSchema.nullable(),
  })),
});

export const executiveReportResponseSchema = z.object({
  currentUser: sessionUserResponseSchema,
  isGMOrAdmin: z.boolean(),
  isSalesManager: z.boolean(),
  kpis: z.object({
    totalPipelineValue: finiteNumber,
    totalWonValue: finiteNumber,
    totalTarget: finiteNumber,
    targetAchievementRate: finiteNumber,
    winRate: finiteNumber,
    totalDealsCount: z.number().int(),
    totalAccountsCount: z.number().int(),
    totalTicketsCount: z.number().int(),
    totalLeadsCount: z.number().int(),
  }),
  regionalBreakdown: z.array(z.object({
    region: z.string(),
    name: z.string(),
    dealsCount: z.number().int(),
    wonValue: finiteNumber,
    pipelineValue: finiteNumber,
    totalValue: finiteNumber,
    accountsCount: z.number().int(),
    openTicketsCount: z.number().int(),
  })),
  salesLeaderboard: z.array(z.object({
    id: z.string(),
    name: z.string(),
    title: z.string(),
    region: z.string(),
    wonAmount: finiteNumber,
    wonCount: z.number().int(),
    openCount: z.number().int(),
    pipelineAmount: finiteNumber,
    totalContribution: finiteNumber,
  })),
  executiveTakeaways: z.array(z.object({
    type: z.string(),
    title: z.string(),
    content: z.string(),
  })),
});
