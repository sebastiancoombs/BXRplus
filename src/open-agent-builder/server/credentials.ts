import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkflowCredentialName =
  | "openai"
  | "anthropic"
  | "groq"
  | "firecrawl"
  | "mcp"
  | "e2b";

type WorkflowExecutionContext = {
  credentials: Partial<Record<WorkflowCredentialName, string>>;
  supabase: SupabaseClient;
};

const executionContext = new AsyncLocalStorage<WorkflowExecutionContext>();

export async function loadWorkflowCredentials(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("get_agent_workflow_secrets");
  if (error) throw error;
  return Object.fromEntries(
    (data || []).map((row: { provider: WorkflowCredentialName; secret: string }) => [
      row.provider,
      row.secret,
    ]),
  ) as Partial<Record<WorkflowCredentialName, string>>;
}
export function withWorkflowCredentials<T>(
  credentials: Partial<Record<WorkflowCredentialName, string>>,
  supabase: SupabaseClient,
  operation: () => Promise<T>,
) {
  return executionContext.run({ credentials, supabase }, operation);
}

export function workflowCredential(name: WorkflowCredentialName) {
  return executionContext.getStore()?.credentials[name];
}

export function workflowSupabase() {
  const supabase = executionContext.getStore()?.supabase;
  if (!supabase) throw new Error("Workflow data context is unavailable.");
  return supabase;
}
