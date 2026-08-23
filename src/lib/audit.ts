import "server-only";

import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";
import { prisma } from "./prisma";

export type AuditResult = "SUCCESS" | "DENIED" | "FAILURE";

interface AuditEventInput {
  request: Request;
  actor?: SessionUser | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  result: AuditResult;
  details?: Record<string, string | number | boolean | null>;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
let auditHashKey: Buffer | null = null;

function getAuditHashKey(): Buffer {
  if (auditHashKey) return auditHashKey;
  const configured = process.env.AUDIT_HASH_SECRET;
  if (configured) {
    if (configured.length < 32 || configured.startsWith("replace-with-")) {
      throw new Error("AUDIT_HASH_SECRET must contain at least 32 non-placeholder characters");
    }
    auditHashKey = Buffer.from(configured, "utf8");
    return auditHashKey;
  }

  const secretPath = join(process.cwd(), ".runtime", "audit-hash-secret");
  mkdirSync(dirname(secretPath), { recursive: true });
  if (!existsSync(secretPath)) {
    try {
      writeFileSync(secretPath, randomBytes(48).toString("base64url"), {
        encoding: "utf8",
        flag: "wx",
      });
    } catch (error) {
      if (!existsSync(secretPath)) throw error;
    }
  }
  auditHashKey = Buffer.from(readFileSync(secretPath, "utf8").trim(), "utf8");
  return auditHashKey;
}

export function requestIdFor(request: Request): string {
  const provided = request.headers.get("x-request-id");
  return provided && REQUEST_ID_PATTERN.test(provided) ? provided : randomUUID();
}

function clientIpHash(request: Request): string {
  const ip = (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    "unknown"
  ).slice(0, 128);
  return createHmac("sha256", getAuditHashKey()).update(ip).digest("hex");
}

type AuditClient = Pick<Prisma.TransactionClient, "auditEvent">;

export async function recordAuditEvent(
  input: AuditEventInput,
  client: AuditClient = prisma
): Promise<void> {
  const serializedDetails = input.details ? JSON.stringify(input.details) : null;
  await client.auditEvent.create({
    data: {
      requestId: requestIdFor(input.request),
      actorId: input.actor?.id || null,
      actorUsername: input.actor?.username || null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId || null,
      result: input.result,
      ipHash: clientIpHash(input.request),
      details: serializedDetails?.slice(0, 4096) || null,
    },
  });
}
