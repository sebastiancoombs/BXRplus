import ky from "ky";
import { supabase } from "@/lib/supabase";

export type AgentWorkflow = {
  id: string;
  name: string;
  description: string;
  nodes: unknown[];
  edges: unknown[];
  status: "draft" | "published" | "archived";
  version: number;
  created_at: string;
  updated_at: string;
};

export type AgentWorkflowRun = {
  id: string;
  workflow_id: string;
  status:
    | "queued"
    | "running"
    | "waiting_approval"
    | "completed"
    | "failed"
    | "cancelled";
  input: unknown;
  output: unknown;
  error: string | null;
  agent_workflow_node_runs?: Array<{
    id: string;
    node_id: string;
    status: string;
    output: unknown;
    error: string | null;
  }>;
};

async function authorizationHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Authentication required.");
  return { Authorization: `Bearer ${session.access_token}` };
}

const workflowApi = ky.create({
  retry: { limit: 1, methods: ["get", "put", "head", "delete", "options", "trace"] },
  timeout: 300_000,
});

export async function listWorkflows() {
  return workflowApi
    .get("/api/workflows", { headers: await authorizationHeaders() })
    .json<{ workflows: AgentWorkflow[] }>();
}

export async function listBxrClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function createWorkflow(input: {
  name: string;
  description?: string;
  nodes: unknown[];
  edges: unknown[];
}) {
  return workflowApi
    .post("/api/workflows", {
      headers: await authorizationHeaders(),
      json: input,
    })
    .json<{ workflow: AgentWorkflow }>();
}

export async function updateWorkflow(
  workflowId: string,
  input: Partial<
    Pick<AgentWorkflow, "name" | "description" | "nodes" | "edges" | "status">
  >,
) {
  return workflowApi
    .patch(`/api/workflows/${workflowId}`, {
      headers: await authorizationHeaders(),
      json: input,
    })
    .json<{ workflow: AgentWorkflow }>();
}

export async function runWorkflow(workflowId: string, input: unknown = {}) {
  return workflowApi
    .post(`/api/workflows/${workflowId}/runs`, {
      headers: await authorizationHeaders(),
      json: { input },
    })
    .json<{ run: AgentWorkflowRun }>();
}

export async function streamWorkflowRun(
  runId: string,
  onRun: (run: AgentWorkflowRun) => void,
) {
  const response = await fetch(`/api/workflow-runs/${runId}/events`, {
    headers: await authorizationHeaders(),
  });
  if (!response.ok || !response.body) {
    throw new Error("Could not stream workflow progress.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let latest: AgentWorkflowRun | undefined;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";
    for (const frame of frames) {
      const line = frame.split("\n").find((entry) => entry.startsWith("data: "));
      if (!line || !frame.includes("event: run")) continue;
      latest = JSON.parse(line.slice(6)) as AgentWorkflowRun;
      onRun(latest);
    }
  }
  if (!latest) throw new Error("Workflow stream ended without a result.");
  return latest;
}
