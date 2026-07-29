"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { cn } from "@/lib/utils";

export default function ClientSelectorSidebar() {
  const { clients, activeClient, setActiveClientId, createClient, loading } = useClientContext();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <aside className="hidden lg:flex h-full w-64 shrink-0 flex-col border-r border-[#e0ddd5] bg-white/70 dark:border-[#2a2a2a] dark:bg-[#161616]/80">
      <div className="flex h-20 items-center justify-between border-b border-[#e0ddd5] px-5 dark:border-[#2a2a2a]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b0ad9a]">Behavior Zone</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-[#3d3b33] dark:text-white">
            <Users size={18} />
            Learners
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setAdding((current) => !current)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#888] transition-colors hover:bg-[#f0ede7] hover:text-[#c2956e] dark:hover:bg-[#252525]"
          aria-label="Add learner"
        >
          <Plus size={18} />
        </button>
      </div>

      {adding && (
        <form
          className="border-b border-[#e0ddd5] p-3 dark:border-[#2a2a2a]"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim()) return;
            setSaving(true);
            await createClient(name.trim());
            setSaving(false);
            setName("");
            setAdding(false);
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Learner name"
            className="h-10 w-full rounded-xl border border-[#e0ddd5] bg-white px-3 text-sm outline-none focus:border-[#c2956e] dark:border-[#333] dark:bg-[#1e1e1e]"
            autoFocus
            required
          />
          <button
            className="mt-2 h-9 w-full rounded-xl bg-[#c2956e] text-xs font-semibold text-white disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Adding…" : "Add learner"}
          </button>
        </form>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {loading ? (
          <p className="px-3 py-4 text-sm text-[#888]">Loading learners…</p>
        ) : clients.length === 0 ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full rounded-xl border border-dashed border-[#d4d0c8] px-3 py-5 text-sm text-[#888] hover:border-[#c2956e] hover:text-[#c2956e]"
          >
            Add your first learner
          </button>
        ) : (
          clients.map((client) => {
            const selected = client.id === activeClient?.id;
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => setActiveClientId(client.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                  selected
                    ? "bg-[#c2956e]/12 text-[#9a704e] dark:bg-[#b0855f]/20 dark:text-[#d1a784]"
                    : "text-[#666] hover:bg-[#f0ede7] dark:text-[#aaa] dark:hover:bg-[#252525]",
                )}
              >
                <span className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  selected ? "bg-[#c2956e] text-white" : "bg-[#ece9e2] text-[#777] dark:bg-[#2a2a2a]",
                )}>
                  {client.full_name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{client.full_name}</span>
                  <span className="block text-[11px] opacity-70">{client.balance} points</span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
