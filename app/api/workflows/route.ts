import { authenticateWorkflowRequest } from "@/src/open-agent-builder/server/auth";
import {
  parseJsonBody,
  createWorkflowSchema,
} from "@/src/open-agent-builder/server/schema";
import {
  WorkflowHttpError,
  workflowErrorResponse,
} from "@/src/open-agent-builder/server/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { supabase } = await authenticateWorkflowRequest(request);
    const { data, error } = await supabase
      .from("agent_workflows")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw new WorkflowHttpError(400, error.message);
    return Response.json({ workflows: data || [] });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await authenticateWorkflowRequest(request);
    const body = await parseJsonBody(request, createWorkflowSchema);
    const { data, error } = await supabase
      .from("agent_workflows")
      .insert({
        owner_id: user.id,
        name: body.name,
        description: body.description,
        nodes: body.nodes,
        edges: body.edges,
        status: body.status,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new WorkflowHttpError(400, error?.message || "Could not create workflow.");
    }

    return Response.json({ workflow: data }, { status: 201 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
