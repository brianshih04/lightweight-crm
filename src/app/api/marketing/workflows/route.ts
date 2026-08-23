import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { apiErrorFromUnknown, apiSuccess, paginatedArrayResponse, parseJsonBody, parseQuery } from "@/lib/api-response";
import { paginationQuerySchema, workflowCreateSchema, workflowUpdateSchema } from "@/lib/contracts";
import { workflowResponseSchema, workflowWithLogsResponseSchema } from "@/lib/response-contracts";
import { executeIdempotentMutation, replayIdempotentMutation } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = await requirePermission("workflows", "read", request);
    if (!authorization.ok) return authorization.response;
    const query = parseQuery(request, paginationQuerySchema);
    if (!query.ok) return query.response;
    const { cursor, limit } = query.data;
    const workflows = await prisma.workflow.findMany({
      include: {
        logs: {
          orderBy: { executedAt: "desc" },
          take: 5,
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return paginatedArrayResponse(request, workflows, limit, workflowWithLogsResponseSchema);
  } catch (error) {
    console.error("Workflows GET Error:", error);
    return apiErrorFromUnknown(request, error, "WORKFLOWS_READ_FAILED", "無法取得自動化流程");
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requirePermission("workflows", "create", request);
    if (!authorization.ok) return authorization.response;
    const parsed = await parseJsonBody(request, workflowCreateSchema);
    if (!parsed.ok) return parsed.response;
    const replay = await replayIdempotentMutation(request, authorization.user.id, parsed.data);
    if (replay) return replay;
    const { name, description, triggerEvent, conditions, actions } = parsed.data;

    return executeIdempotentMutation({
      request,
      actorId: authorization.user.id,
      payload: parsed.data,
      responseSchema: workflowResponseSchema,
      operation: async (tx) => {
        const createdWorkflow = await tx.workflow.create({
          data: {
            name,
            description,
            triggerEvent,
            conditions: typeof conditions === "object" ? JSON.stringify(conditions) : conditions,
            actions: typeof actions === "object" ? JSON.stringify(actions) : actions,
            isActive: true,
          },
        });
        await recordAuditEvent({
          request,
          actor: authorization.user,
          action: "create",
          resource: "workflows",
          resourceId: createdWorkflow.id,
          result: "SUCCESS",
        }, tx);
        return createdWorkflow;
      },
    });
  } catch (error) {
    console.error("Workflows POST Error:", error);
    return apiErrorFromUnknown(request, error, "WORKFLOW_CREATE_FAILED", "無法建立自動化流程");
  }
}

export async function PATCH(request: Request) {
  try {
    const authorization = await requirePermission("workflows", "update", request);
    if (!authorization.ok) return authorization.response;
    const parsed = await parseJsonBody(request, workflowUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const { id, isActive } = parsed.data;

    const workflow = await prisma.$transaction(async (tx) => {
      const updatedWorkflow = await tx.workflow.update({
        where: { id },
        data: { isActive },
      });
      await recordAuditEvent({
        request,
        actor: authorization.user,
        action: "update",
        resource: "workflows",
        resourceId: updatedWorkflow.id,
        result: "SUCCESS",
      }, tx);
      return updatedWorkflow;
    });

    return apiSuccess(request, workflowResponseSchema, workflow);
  } catch (error) {
    console.error("Workflows PATCH Error:", error);
    return apiErrorFromUnknown(request, error, "WORKFLOW_UPDATE_FAILED", "無法更新自動化流程");
  }
}
