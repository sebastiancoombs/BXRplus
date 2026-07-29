"use client";

import { useState } from "react";
import { Plus, Users, X } from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { CLIENT_TABS, type ClientTabKey } from "@/features/client/types";
import { cn } from "@/lib/utils";

export default function MobileBehaviorNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: ClientTabKey;
  onTabChange: (tab: ClientTabKey) => void;
}) {
  const { clients, activeClient, setActiveClientId, createClient } = useClientContext();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-[110] flex h-[calc(76px+env(safe-area-inset-bottom))] items-start gap-1 overflow-x-auto border-t border-[#e0ddd5] bg-white/95 px-2 pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-[#2a2a2a] dark:bg-[#121212]/95 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl text-[#c2956e]"
          aria-label="Choose learner"
        >
          <Users size={22} />
          <span className="text-[9px] font-bold uppercase">Learner</span>
        </button>
        <div className="my-2 h-9 w-px shrink-0 bg-[#e0ddd5] dark:bg-[#333]" />
        {CLIENT_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onTabChange(item.key)}
            className={cn(
              "flex h-14 min-w-[62px] flex-1 shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 transition-colors",
              activeTab === item.key
                ? "bg-[#c2956e]/12 text-[#a57550] dark:bg-[#b0855f]/20 dark:text-[#d1a784]"
                : "text-[#888] dark:text-[#aaa]",
            )}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="max-w-[70px] truncate text-[9px] font-bold uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close learner drawer"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(84vw,340px)] flex-col bg-[#f7f5f0] shadow-2xl dark:bg-[#161616]">
            <div className="flex h-20 items-center justify-between border-b border-[#e0ddd5] px-5 dark:border-[#2a2a2a]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b0ad9a]">Behavior Zone</p>
                <h2 className="mt-1 text-xl font-semibold">Choose learner</h2>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-xl p-2 text-[#888]">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-3">
              {clients.map((client) => {
                const selected = client.id === activeClient?.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setActiveClientId(client.id);
                      setDrawerOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left",
                      selected ? "bg-[#c2956e]/15 text-[#9a704e] dark:bg-[#b0855f]/20 dark:text-[#d1a784]" : "hover:bg-white dark:hover:bg-[#252525]",
                    )}
                  >
                    <span className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full font-bold",
                      selected ? "bg-[#c2956e] text-white" : "bg-[#e8e4dc] dark:bg-[#2a2a2a]",
                    )}>
                      {client.full_name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{client.full_name}</span>
                      <span className="text-xs opacity-65">{client.balance} points</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-[#e0ddd5] p-4 dark:border-[#2a2a2a]">
              {adding ? (
                <form
                  className="space-y-2"
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
                    className="h-11 w-full rounded-xl border bg-white px-3 text-sm dark:border-[#333] dark:bg-[#252525]"
                    autoFocus
                    required
                  />
                  <button disabled={saving} className="h-10 w-full rounded-xl bg-[#c2956e] text-sm font-semibold text-white">
                    {saving ? "Adding…" : "Add learner"}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#c2956e] text-sm font-semibold text-[#9a704e] dark:text-[#d1a784]"
                >
                  <Plus size={17} />
                  Add learner
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
