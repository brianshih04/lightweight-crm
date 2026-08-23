import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { healthResponseSchema } from "@/lib/response-contracts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return apiSuccess(request, healthResponseSchema, {
      status: "ok",
      database: "ok",
      timestamp: new Date(),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Health readiness check failed:", error);
    return apiError(request, 503, "SERVICE_NOT_READY", "服務尚未就緒");
  }
}
