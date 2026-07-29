import { supabase } from "@/lib/supabase";
import type { Folder, Note } from "@/bxrplus-notes/lib/adapter";

export type BxrSessionNote = {
  id: string;
  client_id: string;
  folder_id: string | null;
  service_date: string;
  title: string;
  content?: string;
  quick_notes: string;
  insurance_note: string;
  status: "draft" | "ready" | "submitted";
  sync_mode?: "cloud" | "local";
  locked?: boolean;
  published?: boolean;
  published_at?: string | null;
  deleted_at?: string | null;
  color?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type BxrFolder = {
  id: string;
  client_id: string;
  name: string;
  color: string;
  description?: string;
  sort_order?: number;
  created_by: string;
  created_at: string;
};

export function toBxrPlusNote(note: BxrSessionNote): Note {
  return {
    id: note.id,
    title: note.title || "Session note",
    content: note.content || note.insurance_note || note.quick_notes || "",
    folder_id: note.folder_id,
    sync_mode: note.sync_mode ?? "cloud",
    locked: note.locked ?? false,
    published: note.published ?? false,
    published_at: note.published_at ? Date.parse(note.published_at) : null,
    color: note.color ?? null,
    deleted_at: note.deleted_at ? Date.parse(note.deleted_at) : null,
    created_at: Date.parse(note.created_at || note.service_date),
    updated_at: Date.parse(note.updated_at || note.created_at || note.service_date),
  };
}

export function toBxrPlusFolder(folder: BxrFolder): Folder {
  return {
    id: folder.id,
    name: folder.name,
    color: folder.color,
    description: folder.description ?? "",
    sort_order: folder.sort_order ?? 0,
    created_at: Date.parse(folder.created_at),
    updated_at: Date.parse(folder.created_at),
  };
}

export async function fetchBxrPlusNotes(clientId: string | "all", folderId: string | "all" | "unfiled") {
  let query = supabase
    .from("session_notes")
    .select("*")
    .order("service_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (clientId !== "all") query = query.eq("client_id", clientId);
  if (folderId !== "all") query = folderId === "unfiled" ? query.is("folder_id", null) : query.eq("folder_id", folderId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BxrSessionNote[];
}

export async function fetchBxrPlusFolders(clientId: string | "all") {
  let query = supabase.from("session_note_folders").select("*").order("sort_order").order("name");
  if (clientId !== "all") query = query.eq("client_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BxrFolder[];
}
