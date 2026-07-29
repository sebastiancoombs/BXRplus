// Vendored from BXR+ notes frontend shape and trimmed to the types BXR+ uses.
// The UI components stay BXR+ notes-compatible while persistence is handled by Supabase.

export type Note = {
  id: string;
  title: string;
  content: string;
  folder_id?: string | null;
  sync_mode?: "cloud" | "local";
  locked?: boolean | number;
  published?: boolean | number;
  published_at?: number | null;
  color?: string | null;
  deleted_at?: number | null;
  created_at: number;
  updated_at: number;
};

export type Folder = {
  id: string;
  name: string;
  color: string;
  description?: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
};
