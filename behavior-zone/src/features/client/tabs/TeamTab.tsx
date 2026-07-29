import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PrintableClientCard } from "@/components/PrintableCard";
import type { AppRole } from "@/types/database";

export default function TeamTab({ clientId, isOwner }: { clientId: string; isOwner: boolean }) {
  const { user } = useAuth();
  const { patchClient } = useClientContext();
  const [staff, setStaff] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [role, setRole] = useState<AppRole>("rbt");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  async function fetchTeam() {
    setLoading(true);
    const [c, s] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase.from("client_staff").select("*, profile:profiles(full_name)").eq("client_id", clientId),
    ]);
    setClient(c.data);
    setStaff(s.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchTeam(); }, [clientId]);

  useEffect(() => {
    if (searchName.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").ilike("full_name", `%${searchName}%`).limit(8);
      const staffIds = new Set(staff.map((s: any) => s.user_id));
      const filtered = (data ?? []).filter((p: any) => !staffIds.has(p.id) && p.id !== user?.id);
      setSearchResults(filtered);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchName, staff, user]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectUser(profile: any) {
    setSelectedUser(profile);
    setSearchName(profile.full_name);
    setShowResults(false);
    setError("");
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedUser) {
      setError("Select a person from the dropdown.");
      return;
    }
    setAdding(true);
    const { data } = await supabase.from("client_staff").insert({ client_id: clientId, user_id: selectedUser.id, relationship: role }).select("*, profile:profiles(full_name)").single();
    if (data) setStaff((prev) => [...prev, data]);
    setSearchName("");
    setSelectedUser(null);
    setAdding(false);
  }

  async function removeMember(id: string) {
    await supabase.from("client_staff").delete().eq("id", id);
    setStaff((prev) => prev.filter((member) => member.id !== id));
  }

  async function changeRole(staffId: string, newRole: AppRole) {
    await supabase.from("client_staff").update({ relationship: newRole }).eq("id", staffId);
    setStaff((prev) => prev.map((member) => (member.id === staffId ? { ...member, relationship: newRole } : member)));
  }

  async function transferOwnership(newOwnerId: string) {
    await supabase.rpc("transfer_ownership", { p_client_id: clientId, p_new_owner_id: newOwnerId });
    patchClient(clientId, { owner_id: newOwnerId as any });
    setStaff((prev) => prev.filter((member) => member.user_id !== newOwnerId));
  }

  if (loading) return <p className="text-muted-foreground">Loading team...</p>;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5 p-5 md:p-7 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Support Team</p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">People Supporting This Learner</h2>
      </div>

      {isOwner && (
        <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold">Add Support Team Member</p>
          </div>
          <form onSubmit={addMember} className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-end">
            <div className="relative" ref={searchRef}>
              <Input value={searchName} onChange={(e) => { setSearchName(e.target.value); setSelectedUser(null); }} onFocus={() => searchResults.length > 0 && setShowResults(true)} placeholder="Start typing a name..." className="h-10" required />
              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-muted-foreground">No users found.</div>
                  ) : (
                    searchResults.map((profile: any) => (
                      <button key={profile.id} type="button" onClick={() => selectUser(profile)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">{profile.full_name[0]?.toUpperCase()}</div>
                        <span className="text-sm font-medium">{profile.full_name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <select value={role} onChange={(e) => setRole(e.target.value as AppRole)} className="rounded-xl border border-input bg-background px-3 py-2 text-base h-10">
              <option value="rbt">RBT</option>
              <option value="parent">Parent</option>
              <option value="bcba">BCBA</option>
            </select>
            <Button type="submit" className="h-10" disabled={adding || !selectedUser}>{adding ? "..." : "Add Person"}</Button>
          </form>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </section>
      )}

      <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-semibold">Current Support Team</p>
        </div>
        <div className="space-y-2">
          {staff.map((member: any) => (
            <StaffRow key={member.id} staff={member} isOwner={isOwner} onChangeRole={(newRole) => changeRole(member.id, newRole)} onMakeOwner={() => transferOwnership(member.user_id)} onRemove={() => removeMember(member.id)} />
          ))}
        </div>
      </section>

      {client && (
        <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-sm font-semibold">Client Card</p>
          </div>
          <PrintableClientCard client={client} />
        </section>
      )}
    </div>
  );
}

function StaffRow({ staff, isOwner, onChangeRole, onMakeOwner, onRemove }: {
  staff: any;
  isOwner: boolean;
  onChangeRole: (role: AppRole) => void;
  onMakeOwner: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3">
      <div>
        <p className="text-sm font-medium">{staff.profile?.full_name ?? "Unknown"}</p>
        {isOwner ? (
          <select value={staff.relationship} onChange={(e) => onChangeRole(e.target.value as AppRole)} className="text-base sm:text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer bg-muted">
            <option value="bcba">BCBA</option>
            <option value="rbt">RBT</option>
            <option value="parent">Parent</option>
          </select>
        ) : (
          <Badge>{staff.relationship.toUpperCase()}</Badge>
        )}
      </div>
      {isOwner && (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onMakeOwner}>👑</Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onRemove}>✕</Button>
        </div>
      )}
    </div>
  );
}
