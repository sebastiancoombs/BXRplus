import { useState, useEffect, useCallback } from "react";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import type { AppRole } from "@/types/database";

interface StaffMember {
  id: string;
  user_id: string;
  relationship: AppRole;
  profile?: { full_name: string; role: AppRole } | null;
}

export default function TeamPage() {
  const { profile } = useAuth();
  const { clients, loading, refresh: refreshClients } = useClients();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? clients[0]?.id ?? null;

  // Add client form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [adding, setAdding] = useState(false);

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !profile) return;
    setAdding(true);
    const { data } = await supabase
      .from("clients")
      .insert({ full_name: newName, date_of_birth: newDob || null, avatar_url: null })
      .select()
      .single();
    if (data) {
      await supabase.from("client_staff").insert({
        client_id: data.id,
        user_id: profile.id,
        relationship: profile.role,
      });
    }
    setNewName("");
    setNewDob("");
    setShowAdd(false);
    setAdding(false);
    refreshClients();
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Management</h1>
        <Button onClick={() => setShowAdd(!showAdd)}>+ Add Client</Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="py-4">
            <form onSubmit={addClient} className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Client Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date of Birth</Label>
                <Input type="date" value={newDob} onChange={(e) => setNewDob(e.target.value)} />
              </div>
              <Button type="submit" disabled={adding}>
                {adding ? "Adding..." : "Add"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {clients.length === 0 ? (
        <p className="text-muted-foreground">No clients yet. Add one above.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {/* Client List */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Clients</p>
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeId === c.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                {c.full_name}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {c.balance} pts
                </Badge>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="md:col-span-3">
            {activeId ? (
              <ClientTeamDetail clientId={activeId} />
            ) : (
              <p className="text-muted-foreground">Select a client.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientTeamDetail({ clientId }: { clientId: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);

  // Add member form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("rbt");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const [clientRes, staffRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase
        .from("client_staff")
        .select("*, profile:profiles(full_name, role)")
        .eq("client_id", clientId),
    ]);
    setClient(clientRes.data);
    setStaff((staffRes.data as any) ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAdding(true);

    // Look up user by email from auth — we query profiles
    // Since we can't query auth.users from client, we'll look up by a workaround:
    // In a real app you'd have email on profiles or use an invite system.
    // For now, we look up profiles by full_name or add by user ID.
    // Let's add email to profiles in a future iteration.
    // For now, accept a user ID or name search.

    const { data: found } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .ilike("full_name", `%${email}%`)
      .limit(1)
      .single();

    if (!found) {
      setAddError("No user found with that name. They need to register first.");
      setAdding(false);
      return;
    }

    // Check if already assigned
    const existing = staff.find((s) => s.user_id === found.id);
    if (existing) {
      setAddError("This person is already assigned to this client.");
      setAdding(false);
      return;
    }

    await supabase.from("client_staff").insert({
      client_id: clientId,
      user_id: found.id,
      relationship: role,
    });

    setEmail("");
    setAdding(false);
    fetchStaff();
  }

  async function removeMember(staffId: string) {
    await supabase.from("client_staff").delete().eq("id", staffId);
    fetchStaff();
  }

  if (loading) return <p className="text-muted-foreground">Loading team...</p>;

  const roleColor: Record<string, string> = {
    bcba: "bg-purple-100 text-purple-800",
    rbt: "bg-blue-100 text-blue-800",
    parent: "bg-green-100 text-green-800",
  };

  return (
    <div className="space-y-4">
      {/* Client header + QR */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{client?.full_name}</h2>
            {client?.date_of_birth && (
              <p className="text-sm text-muted-foreground">DOB: {client.date_of_birth}</p>
            )}
            <p className="text-sm text-muted-foreground">Balance: {client?.balance} points</p>
          </div>
          {client?.qr_code && (
            <div className="text-center">
              <QRCodeSVG value={client.qr_code} size={80} />
              <p className="text-xs text-muted-foreground mt-1">Client QR</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Team */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Team Members</p>
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members.</p>
          ) : (
            <div className="space-y-2">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                      {(s.profile?.full_name ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.profile?.full_name ?? "Unknown"}</p>
                      <Badge className={`text-xs ${roleColor[s.relationship] ?? ""}`}>
                        {s.relationship.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeMember(s.id)}>
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Team Member */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Add Team Member</p>
          <form onSubmit={addMember} className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Search by Name</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter person's name..."
                required
              />
            </div>
            <div className="w-32 space-y-1">
              <Label className="text-xs">Role</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AppRole)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
              >
                <option value="rbt">RBT</option>
                <option value="parent">Parent</option>
                <option value="bcba">BCBA</option>
              </select>
            </div>
            <Button type="submit" disabled={adding}>
              {adding ? "Adding..." : "Add"}
            </Button>
          </form>
          {addError && <p className="text-sm text-red-500 mt-2">{addError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
