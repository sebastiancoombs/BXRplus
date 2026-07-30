import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  invokeWorkflowGraph,
  type GraphCallbacks,
  type GraphState,
} from "./graph";
import { ApprovalRequiredError } from "./node-executors";
import { workflowGraphSchema, type WorkflowNode } from "./schema";
import { WorkflowHttpError } from "./errors";
import {
  loadWorkflowCredentials,
  withWorkflowCredentials,
} from "./credentials";

type WorkflowRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  nodes: unknown;
  edges: unknown;
};

type RunRow = {
  id: string;
  workflow_id: string;
  owner_id: string;
  status: string;
  input: unknown;
  output: unknown;
  state: Partial<GraphState> | null;
  error: string | null;
  retry_of: string | null;
};

class WorkflowCancelledError extends Error {
  constructor() {
    super("Workflow run was cancelled.");
    this.name = "WorkflowCancelledError";
  }
}

async function requireWorkflow(
  supabase: SupabaseClient,
  workflowId: string,
): Promise<WorkflowRow> {
  const { data, error } = await supabase
    .from("agent_workflows")
    .select("id, owner_id, name, description, nodes, edges")
    .eq("id", workflowId)
    .single();

  if (error || !data) {
    throw new WorkflowHttpError(404, "Workflow not found.");
  }

  return data as WorkflowRow;
}

async function requireRun(
  supabase: SupabaseClient,
  runId: string,
): Promise<RunRow> {
  const { data, error } = await supabase
    .from("agent_workflow_runs")
    .select(
      "id, workflow_id, owner_id, status, input, output, state, error, retry_of",
    )
    .eq("id", runId)
    .single();

  if (error || !data) {
    throw new WorkflowHttpError(404, "Workflow run not found.");
  }

  return data as RunRow;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown workflow error.";
}

function assertPersistable(value: unknown, label: string) {
  if (JSON.stringify(value).length > 1_000_000) {
    throw new WorkflowHttpError(413, `${label} exceeds the 1 MB execution limit.`);
  }
}

async function audit(
  supabase: SupabaseClient,
  run: Pick<RunRow, "id" | "workflow_id" | "owner_id">,
  eventType: string,
  details: Record<string, unknown> = {},
) {
  await supabase.from("agent_workflow_audit_events").insert({
    owner_id: run.owner_id,
    workflow_id: run.workflow_id,
    run_id: run.id,
    event_type: eventType,
    details,
  });
}

export async function createWorkflowRun(options: {
  supabase: SupabaseClient;
  userId: string;
  workflowId: string;
  input: unknown;
  retryOf?: string;
}) {
  await requireWorkflow(options.supabase, options.workflowId);
  const { error: slotError } = await options.supabase.rpc(
    "claim_agent_workflow_run_slot",
    { workflow: options.workflowId },
  );
  if (slotError) throw new WorkflowHttpError(429, slotError.message);

  const { data, error } = await options.supabase
    .from("agent_workflow_runs")
    .insert({
      workflow_id: options.workflowId,
      owner_id: options.userId,
      status: "queued",
      input: options.input,
      retry_of: options.retryOf || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new WorkflowHttpError(400, error?.message || "Could not create run.");
  }

  await audit(options.supabase, data as RunRow, "run.created", {
    retryOf: options.retryOf || null,
  });
  return data as RunRow;
}

export async function executeWorkflowRun(options: {
  supabase: SupabaseClient;
  runId: string;
}) {
  const run = await requireRun(options.supabase, options.runId);
  const workflow = await requireWorkflow(options.supabase, run.workflow_id);
  const executionStartedAt = Date.now();
  let executedNodes = 0;
  const graph = workflowGraphSchema.safeParse({
    nodes: workflow.nodes,
    edges: workflow.edges,
  });

  if (!graph.success) {
    throw new WorkflowHttpError(
      400,
      graph.error.issues[0]?.message || "Workflow graph is invalid.",
    );
  }

  const { data: existingNodeRuns } = await options.supabase
    .from("agent_workflow_node_runs")
    .select("id, node_id, attempt, status")
    .eq("run_id", run.id)
    .order("attempt", { ascending: false });

  const attempts = new Map<string, number>();
  const activeRows = new Map<string, string>();
  for (const nodeRun of existingNodeRuns || []) {
    if (!attempts.has(nodeRun.node_id)) {
      attempts.set(nodeRun.node_id, nodeRun.attempt);
      if (nodeRun.status === "running") activeRows.set(nodeRun.node_id, nodeRun.id);
    }
  }

  const persistState = async (state: GraphState) => {
    await options.supabase
      .from("agent_workflow_runs")
      .update({ state })
      .eq("id", run.id);
  };

  const callbacks: GraphCallbacks = {
    onNodeStart: async (node, state) => {
      executedNodes += 1;
      if (executedNodes > 100 || Date.now() - executionStartedAt > 240_000) {
        throw new WorkflowHttpError(429, "Workflow execution limit exceeded.");
      }
      const { data: latestRun } = await options.supabase
        .from("agent_workflow_runs")
        .select("status")
        .eq("id", run.id)
        .single();
      if (latestRun?.status === "cancelled") throw new WorkflowCancelledError();

      const attempt = (attempts.get(node.id) || 0) + 1;
      attempts.set(node.id, attempt);
      const { data, error } = await options.supabase
        .from("agent_workflow_node_runs")
        .insert({
          run_id: run.id,
          workflow_id: workflow.id,
          owner_id: run.owner_id,
          node_id: node.id,
          node_type: String(node.data.nodeType || node.type),
          status: "running",
          attempt,
          input: state.lastOutput,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error || !data) throw error || new Error("Could not start node run.");
      activeRows.set(node.id, data.id);
    },
    onNodeComplete: async (node, output, state) => {
      assertPersistable(output, "Node output");
      assertPersistable(state, "Workflow state");
      const nodeRunId = activeRows.get(node.id);
      if (nodeRunId) {
        await options.supabase
          .from("agent_workflow_node_runs")
          .update({
            status: "completed",
            output,
            completed_at: new Date().toISOString(),
          })
          .eq("id", nodeRunId);
      }
      await persistState(state);
    },
    onNodeFailure: async (node, error) => {
      const nodeRunId = activeRows.get(node.id);
      if (nodeRunId) {
        await options.supabase
          .from("agent_workflow_node_runs")
          .update({
            status: error instanceof WorkflowCancelledError ? "cancelled" : "failed",
            error: errorMessage(error),
            completed_at: new Date().toISOString(),
          })
          .eq("id", nodeRunId);
      }
    },
    onApprovalRequired: async (node, error, state) => {
      const nodeRunId = activeRows.get(node.id);
      if (nodeRunId) {
        await options.supabase
          .from("agent_workflow_node_runs")
          .update({
            status: "waiting_approval",
            output: { message: error.messageForUser },
          })
          .eq("id", nodeRunId);
      }
      await options.supabase
        .from("agent_workflow_runs")
        .update({
          status: "waiting_approval",
          state,
          error: error.messageForUser,
        })
        .eq("id", run.id);
    },
  };

  await options.supabase
    .from("agent_workflow_runs")
    .update({
      status: "running",
      error: null,
      started_at: run.status === "queued" ? new Date().toISOString() : undefined,
      completed_at: null,
    })
    .eq("id", run.id);

  try {
    const credentials = await loadWorkflowCredentials(options.supabase);
    const result = await withWorkflowCredentials(credentials, () =>
      invokeWorkflowGraph({
        nodes: graph.data.nodes,
        edges: graph.data.edges,
        input: run.input,
        state: run.state || undefined,
        callbacks,
      }),
    );

    const { data, error } = await options.supabase
      .from("agent_workflow_runs")
      .update({
        status: "completed",
        output: result.lastOutput,
        state: result,
        error: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id)
      .select("*")
      .single();

    if (error || !data) throw error || new Error("Could not finish workflow run.");
    await audit(options.supabase, run, "run.completed");
    return data;
  } catch (error) {
    if (error instanceof ApprovalRequiredError) {
      return requireRun(options.supabase, run.id);
    }

    const cancelled = error instanceof WorkflowCancelledError;
    const { data } = await options.supabase
      .from("agent_workflow_runs")
      .update({
        status: cancelled ? "cancelled" : "failed",
        error: errorMessage(error),
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id)
      .select("*")
      .single();

    await audit(options.supabase, run, cancelled ? "run.cancelled" : "run.failed", {
      error: errorMessage(error).slice(0, 2_000),
    });
    if (cancelled) return data;
    throw error;
  }
}

export async function approveWorkflowRun(options: {
  supabase: SupabaseClient;
  runId: string;
  approved: boolean;
  output?: unknown;
  note?: string;
}) {
  const run = await requireRun(options.supabase, options.runId);
  if (run.status !== "waiting_approval") {
    throw new WorkflowHttpError(409, "This run is not waiting for approval.");
  }

  const { data: waitingNode, error } = await options.supabase
    .from("agent_workflow_node_runs")
    .select("id, node_id")
    .eq("run_id", run.id)
    .eq("status", "waiting_approval")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !waitingNode) {
    throw new WorkflowHttpError(409, "Waiting approval node not found.");
  }

  if (!options.approved) {
    await options.supabase
      .from("agent_workflow_node_runs")
      .update({
        status: "cancelled",
        output: { approved: false, note: options.note },
        completed_at: new Date().toISOString(),
      })
      .eq("id", waitingNode.id);
    const { data } = await options.supabase
      .from("agent_workflow_runs")
      .update({
        status: "cancelled",
        error: options.note || "Approval declined.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id)
      .select("*")
      .single();
    await audit(options.supabase, run, "approval.declined", {
      nodeId: waitingNode.node_id,
    });
    return data;
  }

  const state = run.state || {};
  const nextState: Partial<GraphState> = {
    ...state,
    lastOutput: options.output ?? state.lastOutput,
    completedNodeIds: Array.from(
      new Set([...(state.completedNodeIds || []), waitingNode.node_id]),
    ),
    nodeOutputs: {
      ...(state.nodeOutputs || {}),
      [waitingNode.node_id]: options.output ?? state.lastOutput,
    },
    approvals: {
      ...(state.approvals || {}),
      [waitingNode.node_id]: {
        approved: true,
        output: options.output,
        note: options.note,
      },
    },
  };

  await options.supabase
    .from("agent_workflow_node_runs")
    .update({
      status: "completed",
      output: {
        approved: true,
        output: options.output,
        note: options.note,
      },
      completed_at: new Date().toISOString(),
    })
    .eq("id", waitingNode.id);
  await options.supabase
    .from("agent_workflow_runs")
    .update({
      status: "queued",
      state: nextState,
      error: null,
    })
    .eq("id", run.id);

  await audit(options.supabase, run, "approval.approved", {
    nodeId: waitingNode.node_id,
  });
  return executeWorkflowRun({ supabase: options.supabase, runId: run.id });
}

export async function retryWorkflowRun(options: {
  supabase: SupabaseClient;
  userId: string;
  runId: string;
}) {
  const previousRun = await requireRun(options.supabase, options.runId);
  if (!["failed", "cancelled"].includes(previousRun.status)) {
    throw new WorkflowHttpError(409, "Only failed or cancelled runs can be retried.");
  }
  const { data: relatedRuns } = await options.supabase
    .from("agent_workflow_runs")
    .select("id, retry_of")
    .eq("workflow_id", previousRun.workflow_id);
  const retries = new Map(
    (relatedRuns || []).map((candidate) => [candidate.id, candidate.retry_of]),
  );
  let retryDepth = 0;
  let ancestor = previousRun.retry_of;
  while (ancestor) {
    retryDepth += 1;
    ancestor = retries.get(ancestor) || null;
  }
  if (retryDepth >= 3) {
    throw new WorkflowHttpError(429, "Workflow retry limit reached.");
  }
  const run = await createWorkflowRun({
    supabase: options.supabase,
    userId: options.userId,
    workflowId: previousRun.workflow_id,
    input: previousRun.input,
    retryOf: previousRun.id,
  });
  return executeWorkflowRun({ supabase: options.supabase, runId: run.id });
}
