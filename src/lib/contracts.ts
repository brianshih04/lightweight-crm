import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password";

const id = z.string().trim().min(1).max(100);
const nullableId = id.nullable().optional();
const optionalText = (maximum: number) => z.string().trim().max(maximum).nullable().optional();
const requiredText = (maximum: number) => z.string().trim().min(1).max(maximum);
const optionalEmail = z.union([z.literal(""), z.email().max(254)]).nullable().optional();
const optionalUrl = z.union([z.literal(""), z.url().max(2048)]).nullable().optional();
const region = z.enum(["NORTH", "CENTRAL", "SOUTH", "OVERSEAS"]);
const userRegion = z.enum(["ALL", "NORTH", "CENTRAL", "SOUTH", "OVERSEAS"]);
const role = z.enum(["ADMIN", "GM", "MARKETING_MANAGER", "SALES_MANAGER", "SALES", "ORDER_ADMIN", "MARKETING", "SUPPORT"]);
const password = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);
const nullableDateInput = z.union([
  z.literal(""),
  z.iso.date(),
  z.iso.datetime({ offset: true }),
]).nullable().optional();
const customFields = z.record(z.string().max(100), z.unknown())
  .refine((value) => JSON.stringify(value).length <= 10_000, "自訂欄位不可超過 10,000 字元")
  .optional();

export const loginSchema = z.object({
  username: requiredText(254),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
}).strict();

export const logoutSchema = z.object({ allDevices: z.boolean().optional() }).strict();

const pagination = {
  cursor: id.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
};
export const paginationQuerySchema = z.object(pagination).strict();
export const regionalListQuerySchema = z.object({
  ...pagination,
  region: userRegion.optional(),
}).strict();
export const regionFilterQuerySchema = z.object({ region: userRegion.optional() }).strict();
export const contactListQuerySchema = z.object({
  ...pagination,
  region: userRegion.optional(),
  search: z.string().trim().max(200).default(""),
}).strict();
export const contactRelatedListQuerySchema = z.object({
  ...pagination,
  type: z.enum(["deals", "tickets", "activities"]),
}).strict();
export const ticketListQuerySchema = z.object({
  ...pagination,
  status: z.enum(["ALL", "OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["ALL", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
}).strict();
export const userListQuerySchema = z.object(pagination).strict();
export const auditListQuerySchema = z.object({
  ...pagination,
  action: z.string().trim().min(1).max(50).optional(),
  resource: z.string().trim().min(1).max(50).optional(),
  result: z.enum(["SUCCESS", "DENIED", "FAILURE"]).optional(),
}).strict();

export const initialSetupSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9._-]{3,50}$/),
  name: requiredText(100),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  password,
  passwordConfirm: password,
}).strict().refine((value) => value.password === value.passwordConfirm, {
  path: ["passwordConfirm"],
  message: "兩次輸入的密碼不一致",
});

export const accountCreateSchema = z.object({
  name: requiredText(200),
  industry: optionalText(100),
  region: region.optional(),
  website: optionalUrl,
  phone: optionalText(50),
  address: optionalText(500),
  customFields,
}).strict();

export const contactCreateSchema = z.object({
  name: requiredText(100),
  email: optionalEmail,
  phone: optionalText(50),
  title: optionalText(100),
  accountId: nullableId,
  region: region.optional(),
  tags: optionalText(500),
  customFields,
}).strict();

export const contactActivitySchema = z.object({
  type: z.enum(["NOTE", "CALL", "EMAIL", "MEETING", "TASK"]).optional(),
  title: optionalText(200),
  content: optionalText(10_000),
}).strict().refine((value) => Boolean(value.title || value.content), {
  message: "標題或內容至少需要一項",
});

export const dealCreateSchema = z.object({
  title: requiredText(200),
  value: z.coerce.number().finite().min(0).max(1_000_000_000_000).default(0),
  pipelineId: id,
  stageId: id,
  contactId: nullableId,
  accountId: nullableId,
  assignedToId: nullableId,
  region: region.optional(),
  expectedCloseDate: nullableDateInput,
  notes: optionalText(10_000),
}).strict();

export const dealUpdateSchema = z.object({
  dealId: id,
  stageId: id.optional(),
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
}).strict().refine((value) => Boolean(value.stageId || value.status), {
  message: "至少需要更新 stageId 或 status",
});

const leadCreate = z.object({
  action: z.undefined().optional(),
  name: requiredText(100),
  email: optionalEmail,
  phone: optionalText(50),
  company: optionalText(200),
  source: z.enum(["Website", "Referral", "Ads", "Event", "Cold Call"]).optional(),
  score: z.coerce.number().int().min(0).max(100).optional(),
  region: region.optional(),
  notes: optionalText(10_000),
  assignedToId: nullableId,
}).strict();
const leadConvert = z.object({
  action: z.literal("CONVERT"),
  leadId: id,
  dealTitle: optionalText(200),
  dealValue: z.coerce.number().finite().min(0).max(1_000_000_000_000).default(0),
}).strict();
export const leadMutationSchema = z.union([leadConvert, leadCreate]);

export const ticketCreateSchema = z.object({
  subject: requiredText(300),
  description: requiredText(20_000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  channel: z.enum(["EMAIL", "WEB", "PHONE", "CHAT"]).optional(),
  contactId: nullableId,
  accountId: nullableId,
  assignedToId: nullableId,
}).strict();

export const ticketMessageSchema = z.object({
  content: requiredText(20_000),
  isInternal: z.boolean().optional(),
  senderName: optionalText(100),
}).strict();

export const ticketUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: nullableId,
}).strict().refine((value) => Object.values(value).some((entry) => entry !== undefined), {
  message: "至少需要一個更新欄位",
});

export const campaignCreateSchema = z.object({
  name: requiredText(200),
  channel: z.enum(["EMAIL", "SMS", "WEBHOOK"]).optional(),
  segmentId: nullableId,
  templateId: nullableId,
  subject: optionalText(300),
  scheduledAt: nullableDateInput,
}).strict();

const workflowValue = z.union([
  z.string().max(20_000),
  z.record(z.string().max(100), z.unknown()),
  z.array(z.record(z.string().max(100), z.unknown())).max(50),
]);
export const workflowCreateSchema = z.object({
  name: requiredText(200),
  description: optionalText(2_000),
  triggerEvent: z.enum(["NEW_LEAD", "DEAL_WON", "TICKET_CREATED", "FORM_SUBMIT"]),
  conditions: workflowValue.optional(),
  actions: workflowValue,
}).strict();
export const workflowUpdateSchema = z.object({ id, isActive: z.boolean() }).strict();

export const userCreateSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9._-]{3,50}$/),
  password,
  name: requiredText(100),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  role: role.optional(),
  department: optionalText(100),
  region: userRegion.optional(),
  title: optionalText(100),
  managerId: nullableId,
}).strict();

export const userUpdateSchema = z.object({
  name: requiredText(100).optional(),
  email: z.email().max(254).transform((value) => value.toLowerCase()).optional(),
  role: role.optional(),
  department: requiredText(100).optional(),
  region: userRegion.optional(),
  title: requiredText(100).optional(),
  managerId: nullableId,
  password: password.optional(),
}).strict().refine((value) => Object.values(value).some((entry) => entry !== undefined), {
  message: "至少需要一個更新欄位",
});
