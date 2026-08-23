import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export type UserRole = "ADMIN" | "GM" | "MARKETING_MANAGER" | "SALES_MANAGER" | "SALES" | "ORDER_ADMIN" | "MARKETING" | "SUPPORT";
export type UserRegion = "ALL" | "NORTH" | "CENTRAL" | "SOUTH" | "OVERSEAS";
export type DataRegion = Exclude<UserRegion, "ALL">;

const USER_ROLES = new Set<UserRole>(["ADMIN", "GM", "MARKETING_MANAGER", "SALES_MANAGER", "SALES", "ORDER_ADMIN", "MARKETING", "SUPPORT"]);
const USER_REGIONS = new Set<UserRegion>(["ALL", "NORTH", "CENTRAL", "SOUTH", "OVERSEAS"]);

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  region: UserRegion;
  title: string;
  managerId?: string | null;
}

export const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
  department: true,
  region: true,
  title: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const AUTH_COOKIE_NAME = "crm_auth_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthSession(response: NextResponse, userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.$transaction([
    prisma.authSession.create({
      data: {
        tokenHash: hashSessionToken(token),
        userId,
        expiresAt,
        lastSeenAt: now,
      },
    }),
    prisma.authSession.deleteMany({
      where: { expiresAt: { lt: now } },
    }),
  ]);

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function revokeCurrentSession(response: NextResponse): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    await prisma.authSession.updateMany({
      where: { tokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  response.cookies.delete(AUTH_COOKIE_NAME);
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function sessionUserFromDatabase(user: {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  department: string;
  region: string;
  title: string;
  managerId: string | null;
}): SessionUser | null {
  if (!USER_ROLES.has(user.role as UserRole) || !USER_REGIONS.has(user.region as UserRegion)) {
    return null;
  }
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    department: user.department,
    region: user.region as UserRegion,
    title: user.title,
    managerId: user.managerId,
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const now = new Date();
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          department: true,
          region: true,
          title: true,
          managerId: true,
          isActive: true,
        },
      },
    },
  });
  if (!session || session.revokedAt || session.expiresAt <= now || !session.user.isActive) return null;

  if (now.getTime() - session.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS) {
    await prisma.authSession.updateMany({
      where: { id: session.id, revokedAt: null, expiresAt: { gt: now } },
      data: { lastSeenAt: now },
    });
  }

  return sessionUserFromDatabase(session.user);
}

export function isAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "ADMIN";
}

export function isGM(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "GM";
}

export function isGMOrAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "ADMIN" || user.role === "GM";
}

export function isSalesManager(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "SALES_MANAGER";
}

export function isMarketingManager(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "MARKETING_MANAGER";
}

export function isSalesRep(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "SALES";
}

export function isOrderAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "ORDER_ADMIN";
}

export function roleRequiresRegionalScope(role: string): boolean {
  return ["SALES_MANAGER", "SALES", "ORDER_ADMIN"].includes(role);
}

export function canManageUserRole(managerRole: string, subordinateRole: string): boolean {
  if (managerRole === "ADMIN" || managerRole === "GM") return true;
  if (managerRole === "SALES_MANAGER") return ["SALES", "ORDER_ADMIN"].includes(subordinateRole);
  // 訂單管理員是支援單位，組織上可掛在市場部主管之下（僅影響主管欄位驗證，
  // 使用者管理 API 仍限 ADMIN/GM 呼叫）。
  if (managerRole === "MARKETING_MANAGER") return ["MARKETING", "ORDER_ADMIN"].includes(subordinateRole);
  return false;
}

/**
 * Deal Scope Filter:
 * - Admin & GM: Sees ALL regions (or queryRegion if filter selected)
 * - Sales Manager: Sees ALL deals in their Region (including all subordinate Sales reps)
 * - Sales Rep: Sees deals assigned to them or in their specific assigned Region
 */
export function asDataRegion(value?: string | null): DataRegion | undefined {
  return value && value !== "ALL" && USER_REGIONS.has(value as UserRegion)
    ? value as DataRegion
    : undefined;
}

export function getDealScopeFilter(
  user: SessionUser | null,
  queryRegion?: string | null
): Prisma.DealWhereInput {
  if (!user) return { id: "__unauthorized__" };
  if (isGMOrAdmin(user)) {
    const requestedRegion = asDataRegion(queryRegion);
    if (requestedRegion) return { region: requestedRegion };
    return {};
  }

  if (isSalesManager(user)) {
    const region = asDataRegion(user.region);
    return region ? { region } : { id: "__unauthorized__" };
  }

  if (isSalesRep(user)) {
    const region = asDataRegion(user.region);
    if (!region) return { id: "__unauthorized__" };
    return {
      AND: [
        { region },
        { assignedToId: user.id },
      ],
    };
  }

  return user.region !== "ALL" ? { region: user.region } : {};
}

/**
 * Contact & Account Scope Filter:
 * - Admin & GM: Sees ALL
 * - Sales Manager & Sales: Sees their Region
 */
export function getEntityScopeFilter(
  user: SessionUser | null,
  queryRegion?: string | null
): { id?: string; region?: DataRegion } {
  if (!user) return { id: "__unauthorized__" };
  if (isGMOrAdmin(user)) {
    const requestedRegion = asDataRegion(queryRegion);
    if (requestedRegion) return { region: requestedRegion };
    return {};
  }

  const region = asDataRegion(user.region);
  return region ? { region } : {};
}

/**
 * Lead Scope Filter:
 * - Admin & GM: All leads
 * - Sales Manager: All leads in Region
 * - Sales: Leads assigned to them in Region
 */
export function getLeadScopeFilter(
  user: SessionUser | null,
  queryRegion?: string | null
): Prisma.LeadWhereInput {
  if (!user) return { id: "__unauthorized__" };
  if (isGMOrAdmin(user)) {
    const requestedRegion = asDataRegion(queryRegion);
    if (requestedRegion) return { region: requestedRegion };
    return {};
  }

  if (isSalesManager(user)) {
    const region = asDataRegion(user.region);
    return region ? { region } : { id: "__unauthorized__" };
  }

  if (isSalesRep(user)) {
    const region = asDataRegion(user.region);
    if (!region) return { id: "__unauthorized__" };
    return {
      AND: [
        { region },
        { assignedToId: user.id },
      ],
    };
  }

  return user.region !== "ALL" ? { region: user.region } : {};
}
