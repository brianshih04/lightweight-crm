import { cookies } from "next/headers";
import { prisma } from "./prisma";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: "ADMIN" | "GM" | "SALES_MANAGER" | "SALES" | "MARKETING" | "SUPPORT" | string;
  department: string;
  region: string; // ALL, NORTH, CENTRAL, SOUTH, OVERSEAS
  title: string;
  managerId?: string | null;
}

const COOKIE_NAME = "crm_auth_session";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const sessionData = cookieStore.get(COOKIE_NAME)?.value;

  if (sessionData) {
    try {
      const parsed = JSON.parse(sessionData) as SessionUser;
      return parsed;
    } catch (e) {
      console.error("Session parse error", e);
    }
  }

  // Fallback to default Admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (adminUser) {
    return {
      id: adminUser.id,
      username: adminUser.username,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      department: adminUser.department,
      region: adminUser.region,
      title: adminUser.title,
      managerId: adminUser.managerId,
    };
  }

  return null;
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

export function isSalesRep(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "SALES";
}

/**
 * Deal Scope Filter:
 * - Admin & GM: Sees ALL regions (or queryRegion if filter selected)
 * - Sales Manager: Sees ALL deals in their Region (including all subordinate Sales reps)
 * - Sales Rep: Sees deals assigned to them or in their specific assigned Region
 */
export function getDealScopeFilter(user: SessionUser | null, queryRegion?: string | null) {
  if (!user || isGMOrAdmin(user)) {
    if (queryRegion && queryRegion !== "ALL") {
      return { region: queryRegion };
    }
    return {};
  }

  if (isSalesManager(user)) {
    return { region: user.region };
  }

  if (isSalesRep(user)) {
    return {
      AND: [
        { region: user.region },
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
export function getEntityScopeFilter(user: SessionUser | null, queryRegion?: string | null) {
  if (!user || isGMOrAdmin(user)) {
    if (queryRegion && queryRegion !== "ALL") {
      return { region: queryRegion };
    }
    return {};
  }

  return user.region !== "ALL" ? { region: user.region } : {};
}

/**
 * Lead Scope Filter:
 * - Admin & GM: All leads
 * - Sales Manager: All leads in Region
 * - Sales: Leads assigned to them in Region
 */
export function getLeadScopeFilter(user: SessionUser | null, queryRegion?: string | null) {
  if (!user || isGMOrAdmin(user)) {
    if (queryRegion && queryRegion !== "ALL") {
      return { region: queryRegion };
    }
    return {};
  }

  if (isSalesManager(user)) {
    return { region: user.region };
  }

  if (isSalesRep(user)) {
    return {
      AND: [
        { region: user.region },
        { assignedToId: user.id },
      ],
    };
  }

  return user.region !== "ALL" ? { region: user.region } : {};
}
