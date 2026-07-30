import { authenticateWorkflowRequest } from "@/src/open-agent-builder/server/auth";
import {
  parseJsonBody,
  runWorkflowSchema,
} from "@/src/open-agent-builder/server/schema";
import {
  createWorkflowRun,
  executeWorkflowRun,
} from "@/src/open-agent-builder/server/execution-service";
import {
  WorkflowHttpError,
  workflowErrorResponse,
} from "@/src/open-agent-builder/server/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ workflowId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { workflowId } = await context.params;
    const { supabase } = await authenticateWorkflowRequest(request);
    const { data, error } = await supabase
      .from("agent_workflow_runs")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new WorkflowHttpError(400, error.message);

    return Response.json({ runs: data || [] });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workflowId } = await context.params;
    const { supabase, user } = await authenticateWorkflowRequest(request);
    const body = await parseJsonBody(request, runWorkflowSchema);
    const run = await createWorkflowRun({
      supabase,
      userId: user.id,
      workflowId,
      input: body.input,
    });
    const result = await executeWorkflowRun({ supabase, runId: run.id });

    return Response.json({ run: result }, { status: 201 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
