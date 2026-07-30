import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { WorkflowHttpError } from "./errors";

export type WorkflowAuth = {
  user: User;
  token: string;
  supabase: SupabaseClient;
};

export async function authenticateWorkflowRequest(
  request: Request,
): Promise<WorkflowAuth> {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) {
    throw new WorkflowHttpError(401, "Authentication required.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new WorkflowHttpError(500, "Supabase is not configured.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new WorkflowHttpError(401, "Authentication required.");
  }

  return { user, token, supabase };
}
