import { authenticateWorkflowRequest } from "@/src/open-agent-builder/server/auth";
import {
  parseJsonBody,
  approvalSchema,
} from "@/src/open-agent-builder/server/schema";
import { approveWorkflowRun } from "@/src/open-agent-builder/server/execution-service";
import { workflowErrorResponse } from "@/src/open-agent-builder/server/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ runId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { runId } = await context.params;
    const { supabase } = await authenticateWorkflowRequest(request);
    const body = await parseJsonBody(request, approvalSchema);
    const run = await approveWorkflowRun({
      supabase,
      runId,
      approved: body.approved,
      output: body.output,
      note: body.note,
    });
    return Response.json({ run });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
