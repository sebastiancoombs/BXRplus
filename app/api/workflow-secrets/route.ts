import { authenticateWorkflowRequest } from "@/src/open-agent-builder/server/auth";
import {
  parseJsonBody,
  workflowSecretSchema,
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
      .from("agent_workflow_secrets")
      .select("provider, created_at, updated_at")
      .order("provider");
    if (error) throw new WorkflowHttpError(400, error.message);
    return Response.json({ credentials: data || [] });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
export async function PUT(request: Request) {
  try {
    const { supabase } = await authenticateWorkflowRequest(request);
    const body = await parseJsonBody(request, workflowSecretSchema);
    const { error } = await supabase.rpc("save_agent_workflow_secret", {
      provider_name: body.provider,
      secret_value: body.secret,
    });
    if (error) throw new WorkflowHttpError(400, error.message);
    return Response.json({ saved: true, provider: body.provider });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase } = await authenticateWorkflowRequest(request);
    const provider = new URL(request.url).searchParams.get("provider");
    const parsed = workflowSecretSchema.shape.provider.safeParse(provider);
    if (!parsed.success) throw new WorkflowHttpError(400, "Invalid provider.");
    const { error } = await supabase.rpc("delete_agent_workflow_secret", {
      provider_name: parsed.data,
    });
    if (error) throw new WorkflowHttpError(400, error.message);
    return Response.json({ deleted: true, provider: parsed.data });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
