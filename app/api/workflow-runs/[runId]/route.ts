import { authenticateWorkflowRequest } from "@/src/open-agent-builder/server/auth";
import {
  WorkflowHttpError,
  workflowErrorResponse,
} from "@/src/open-agent-builder/server/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { runId } = await context.params;
    const { supabase } = await authenticateWorkflowRequest(request);
    const { data, error } = await supabase
      .from("agent_workflow_runs")
      .select("*, agent_workflow_node_runs(*)")
      .eq("id", runId)
      .order("created_at", {
        referencedTable: "agent_workflow_node_runs",
        ascending: true,
      })
      .single();

    if (error || !data) throw new WorkflowHttpError(404, "Workflow run not found.");
    return Response.json({ run: data });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { runId } = await context.params;
    const { supabase } = await authenticateWorkflowRequest(request);
    const { data, error } = await supabase
      .from("agent_workflow_runs")
      .update({
        status: "cancelled",
        error: "Cancelled by user.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .in("status", ["queued", "running", "waiting_approval"])
      .select("*")
      .single();

    if (error || !data) {
      throw new WorkflowHttpError(409, "Workflow run cannot be cancelled.");
    }
    await supabase
      .from("agent_workflow_node_runs")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("run_id", runId)
      .in("status", ["queued", "running", "waiting_approval"]);
    await supabase.from("agent_workflow_audit_events").insert({
      owner_id: data.owner_id,
      workflow_id: data.workflow_id,
      run_id: data.id,
      event_type: "run.cancelled",
      details: { source: "user" },
    });

    return Response.json({ run: data });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
