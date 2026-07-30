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

const credentialStorage = new AsyncLocalStorage<
  Partial<Record<WorkflowCredentialName, string>>
>();

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
  operation: () => Promise<T>,
) {
  return credentialStorage.run(credentials, operation);
}

export function workflowCredential(name: WorkflowCredentialName) {
  return credentialStorage.getStore()?.[name];
}
