import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const IDENTITY_LIMIT = 10;
const IP_LIMIT = 30;

interface ThrottleKey {
  key: string;
  limit: number;
}

export interface ThrottleState {
  blocked: boolean;
  retryAfterSeconds: number;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function identityKey(identifier: string): string {
  return `identity:${digest(identifier.trim().toLowerCase())}`;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    "unknown"
  ).slice(0, 128);
}

function keysFor(request: Request, identifier: string): ThrottleKey[] {
  return [
    { key: identityKey(identifier), limit: IDENTITY_LIMIT },
    { key: `ip:${digest(clientIp(request))}`, limit: IP_LIMIT },
  ];
}

function retryAfter(blockedUntil: Date | null, now: Date): number {
  if (!blockedUntil || blockedUntil <= now) return 0;
  return Math.max(1, Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000));
}

export async function getLoginThrottle(request: Request, identifier: string): Promise<ThrottleState> {
  const now = new Date();
  const records = await prisma.loginThrottle.findMany({
    where: { key: { in: keysFor(request, identifier).map(({ key }) => key) } },
  });
  const retryAfterSeconds = records.reduce(
    (maximum, record) => Math.max(maximum, retryAfter(record.blockedUntil, now)),
    0
  );
  return { blocked: retryAfterSeconds > 0, retryAfterSeconds };
}

async function recordKeyFailure(
  tx: Prisma.TransactionClient,
  throttleKey: ThrottleKey,
  now: Date
): Promise<number> {
  const current = await tx.loginThrottle.findUnique({ where: { key: throttleKey.key } });
  const windowExpired = !current || now.getTime() - current.windowStartedAt.getTime() >= WINDOW_MS;
  const failedCount = windowExpired ? 1 : current.failedCount + 1;
  const blockedUntil = failedCount >= throttleKey.limit
    ? new Date(now.getTime() + BLOCK_MS)
    : null;

  await tx.loginThrottle.upsert({
    where: { key: throttleKey.key },
    create: {
      key: throttleKey.key,
      failedCount,
      windowStartedAt: now,
      blockedUntil,
    },
    update: {
      failedCount,
      windowStartedAt: windowExpired ? now : current!.windowStartedAt,
      blockedUntil,
    },
  });
  return retryAfter(blockedUntil, now);
}

export async function recordLoginFailure(request: Request, identifier: string): Promise<ThrottleState> {
  const now = new Date();
  const retryAfterSeconds = await prisma.$transaction(async (tx) => {
    let maximum = 0;
    for (const throttleKey of keysFor(request, identifier)) {
      maximum = Math.max(maximum, await recordKeyFailure(tx, throttleKey, now));
    }
    return maximum;
  });
  return { blocked: retryAfterSeconds > 0, retryAfterSeconds };
}

export async function clearLoginIdentityThrottle(identifier: string): Promise<void> {
  const cleanupBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.loginThrottle.deleteMany({ where: { key: identityKey(identifier) } }),
    prisma.loginThrottle.deleteMany({ where: { updatedAt: { lt: cleanupBefore } } }),
  ]);
}
