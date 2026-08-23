export type PermissionAction = "read" | "create" | "update" | "delete" | "manage";
export type PermissionResource =
  | "dashboard"
  | "accounts"
  | "contacts"
  | "deals"
  | "leads"
  | "tickets"
  | "campaigns"
  | "workflows"
  | "reports"
  | "users"
  | "audit";

export type KnownRole = "ADMIN" | "GM" | "MARKETING_MANAGER" | "SALES_MANAGER" | "SALES" | "ORDER_ADMIN" | "MARKETING" | "SUPPORT";

const ALL_ROLES: readonly KnownRole[] = [
  "ADMIN",
  "GM",
  "MARKETING_MANAGER",
  "SALES_MANAGER",
  "SALES",
  "ORDER_ADMIN",
  "MARKETING",
  "SUPPORT",
];
const SALES_DATA_ROLES: readonly KnownRole[] = ["ADMIN", "GM", "SALES_MANAGER", "SALES", "ORDER_ADMIN"];
const SALES_WRITE_ROLES: readonly KnownRole[] = ["ADMIN", "GM", "SALES_MANAGER", "SALES"];
const ORDER_ROLES: readonly KnownRole[] = ["ADMIN", "GM", "SALES_MANAGER", "SALES", "ORDER_ADMIN"];
const SUPPORT_ROLES: readonly KnownRole[] = ["ADMIN", "GM", "SUPPORT"];
const MARKETING_ROLES: readonly KnownRole[] = ["ADMIN", "GM", "MARKETING_MANAGER", "MARKETING"];
const MANAGEMENT_ROLES: readonly KnownRole[] = ["ADMIN", "GM"];
const REPORT_ROLES: readonly KnownRole[] = ["ADMIN", "GM", "SALES_MANAGER"];
const AUDIT_ROLES: readonly KnownRole[] = ["ADMIN"];

export const permissionMatrix: Record<
  PermissionResource,
  Partial<Record<PermissionAction, readonly KnownRole[]>>
> = {
  dashboard: { read: ALL_ROLES },
  accounts: { read: ALL_ROLES, create: SALES_WRITE_ROLES, update: SALES_WRITE_ROLES, delete: MANAGEMENT_ROLES },
  contacts: { read: ALL_ROLES, create: SALES_WRITE_ROLES, update: SALES_WRITE_ROLES, delete: MANAGEMENT_ROLES },
  deals: { read: SALES_DATA_ROLES, create: ORDER_ROLES, update: ORDER_ROLES, delete: MANAGEMENT_ROLES },
  leads: { read: SALES_DATA_ROLES, create: SALES_WRITE_ROLES, update: SALES_WRITE_ROLES, delete: MANAGEMENT_ROLES },
  tickets: { read: ALL_ROLES, create: ALL_ROLES, update: SUPPORT_ROLES, delete: MANAGEMENT_ROLES },
  campaigns: { read: MARKETING_ROLES, create: MARKETING_ROLES, update: MARKETING_ROLES, delete: MANAGEMENT_ROLES },
  workflows: { read: MARKETING_ROLES, create: MARKETING_ROLES, update: MARKETING_ROLES, delete: MANAGEMENT_ROLES },
  reports: { read: REPORT_ROLES },
  users: { read: MANAGEMENT_ROLES, create: MANAGEMENT_ROLES, update: MANAGEMENT_ROLES, delete: MANAGEMENT_ROLES, manage: MANAGEMENT_ROLES },
  audit: { read: AUDIT_ROLES },
};

export function hasPermission(
  user: { role: string },
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  const allowedRoles = permissionMatrix[resource]?.[action];
  return Boolean(allowedRoles?.includes(user.role as KnownRole));
}
