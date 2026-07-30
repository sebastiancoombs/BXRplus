import { authenticateWorkflowRequest } from "@/src/open-agent-builder/server/auth";
import {
  parseJsonBody,
  updateWorkflowSchema,
  workflowGraphSchema,
} from "@/src/open-agent-builder/server/schema";
import {
  WorkflowHttpError,
  workflowErrorResponse,
} from "@/src/open-agent-builder/server/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ workflowId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { workflowId } = await context.params;
    const { supabase } = await authenticateWorkflowRequest(request);
    const { data, error } = await supabase
      .from("agent_workflows")
      .select("*, agent_workflow_versions(*)")
      .eq("id", workflowId)
      .order("version", {
        referencedTable: "agent_workflow_versions",
        ascending: false,
      })
      .single();

    if (error || !data) throw new WorkflowHttpError(404, "Workflow not found.");
    return Response.json({ workflow: data });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workflowId } = await context.params;
    const { supabase } = await authenticateWorkflowRequest(request);
    const body = await parseJsonBody(request, updateWorkflowSchema);

    if (body.nodes || body.edges) {
      const { data: current, error: currentError } = await supabase
        .from("agent_workflows")
        .select("nodes, edges")
        .eq("id", workflowId)
        .single();
      if (currentError || !current) {
        throw new WorkflowHttpError(404, "Workflow not found.");
      }

      const graph = workflowGraphSchema.safeParse({
        nodes: body.nodes || current.nodes,
        edges: body.edges || current.edges,
      });
      if (!graph.success) {
        throw new WorkflowHttpError(
          400,
          graph.error.issues[0]?.message || "Workflow graph is invalid.",
        );
      }
    }

    const { data, error } = await supabase
      .from("agent_workflows")
      .update(body)
      .eq("id", workflowId)
      .select("*")
      .single();
    if (error || !data) throw new WorkflowHttpError(404, "Workflow not found.");

    return Response.json({ workflow: data });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { workflowId } = await context.params;
    const { supabase } = await authenticateWorkflowRequest(request);
    const { error } = await supabase
      .from("agent_workflows")
      .delete()
      .eq("id", workflowId);
    if (error) throw new WorkflowHttpError(400, error.message);

    return new Response(null, { status: 204 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
