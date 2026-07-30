import { authenticateWorkflowRequest } from "@/src/open-agent-builder/server/auth";
import { retryWorkflowRun } from "@/src/open-agent-builder/server/execution-service";
import { workflowErrorResponse } from "@/src/open-agent-builder/server/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ runId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { runId } = await context.params;
    const { supabase, user } = await authenticateWorkflowRequest(request);
    const run = await retryWorkflowRun({
      supabase,
      userId: user.id,
      runId,
    });
    return Response.json({ run }, { status: 201 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
