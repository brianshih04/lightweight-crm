import { requirePermission } from "@/lib/authorization";
import { apiErrorFromUnknown, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { securitySummaryResponseSchema } from "@/lib/response-contracts";
import { deriveSecurityAlerts } from "@/lib/security-monitor";

export const dynamic = "force-dynamic";

function countsByResult(rows: Array<{ result: string; _count: { _all: number } }>) {
  const counts = { success: 0, denied: 0, failure: 0 };
  for (const row of rows) {
    if (row.result === "SUCCESS") counts.success = row._count._all;
    if (row.result === "DENIED") counts.denied = row._count._all;
    if (row.result === "FAILURE") counts.failure = row._count._all;
  }
  return counts;
}

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("audit", "read", request);
    if (!authorization.ok) return authorization.response;

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [last24hRows, recentRows, activeLoginBlocks, sourceRows] = await Promise.all([
      prisma.auditEvent.groupBy({
        by: ["result"],
        where: { createdAt: { gte: twentyFourHoursAgo } },
        _count: { _all: true },
      }),
      prisma.auditEvent.groupBy({
        by: ["result"],
        where: { createdAt: { gte: fifteenMinutesAgo } },
        _count: { _all: true },
      }),
      prisma.loginThrottle.count({ where: { blockedUntil: { gt: now } } }),
      prisma.auditEvent.groupBy({
        by: ["ipHash"],
        where: {
          createdAt: { gte: fifteenMinutesAgo },
          result: { in: ["DENIED", "FAILURE"] },
          ipHash: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

    const recent = countsByResult(recentRows);
    const topSources15m = sourceRows.map((row) => ({
      ipHash: row.ipHash!,
      count: row._count.id,
    }));
    const alerts = deriveSecurityAlerts({
      denied15m: recent.denied,
      failures15m: recent.failure,
      activeLoginBlocks,
      topSources15m,
    });

    return apiSuccess(request, securitySummaryResponseSchema, {
      generatedAt: now,
      last24h: countsByResult(last24hRows),
      last15m: recent,
      activeLoginBlocks,
      topSources15m,
      status: alerts.some((alert) => alert.severity === "CRITICAL")
        ? "CRITICAL"
        : alerts.length > 0
          ? "WARNING"
          : "OK",
      alerts,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Audit summary GET Error:", error);
    return apiErrorFromUnknown(request, error, "AUDIT_SUMMARY_FAILED", "無法取得安全監控摘要");
  }
}
