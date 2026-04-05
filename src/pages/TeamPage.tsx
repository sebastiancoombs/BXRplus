import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
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
  profile?: { full_name: string } | null;
}

export default function TeamPage() {
  const { user } = useAuth();
  const { clients, activeClient, setActiveClientId, loading, refresh: refreshClients } = useClientContext();

  // Add client form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [myRole, setMyRole] = useState<AppRole>("bcba");
  const [adding, setAdding] = useState(false);

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !user) return;
    setAdding(true);
    const { data } = await supabase
      .from("clients")
      .insert({ full_name: newName, date_of_birth: newDob || null, avatar_url: null })
      .select()
      .single();
    if (data) {
      await supabase.from("client_staff").insert({
        client_id: data.id,
        user_id: user.id,
        relationship: myRole,
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
        <h1 className="text-2xl font-bold">Team & Clients</h1>
        <Button onClick={() => setShowAdd(!showAdd)}>+ Add Client</Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="py-4">
            <form onSubmit={addClient} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px] space-y-1">
                <Label className="text-xs">Client Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Alex" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date of Birth</Label>
                <Input type="date" value={newDob} onChange={(e) => setNewDob(e.target.value)} />
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs">My Role</Label>
                <select
                  value={myRole}
                  onChange={(e) => setMyRole(e.target.value as AppRole)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                >
                  <option value="bcba">BCBA</option>
                  <option value="rbt">RBT</option>
                  <option value="parent">Parent</option>
                </select>
              </div>
              <Button type="submit" disabled={adding}>
                {adding ? "Adding..." : "Add Client"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-4xl mb-4">👋</p>
            <p className="text-lg font-medium">No clients yet</p>
            <p>Add your first client to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {/* Client List */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Clients</p>
            {clients.map((c) => {
              const badgeColors: Record<string, string> = {
                bcba: "bg-purple-100 text-purple-700",
                rbt: "bg-blue-100 text-blue-700",
                parent: "bg-green-100 text-green-700",
              };
              const badge = badgeColors[c.myRole ?? ""] ?? "";
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveClientId(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeClient?.id === c.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <span>{c.full_name}</span>
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    activeClient?.id === c.id ? "bg-white/20 text-white" : badge
                  }`}>
                    {(c.myRole ?? "").toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          <div className="md:col-span-3">
            {activeClient ? (
              <ClientTeamDetail clientId={activeClient.id} myRole={activeClient.myRole} />
            ) : (
              <p className="text-muted-foreground">Select a client.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientTeamDetail({ clientId, myRole }: { clientId: string; myRole: AppRole | null }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const isBCBA = myRole === "bcba";

  // Add member form
  const [searchName, setSearchName] = useState("");
  const [role, setRole] = useState<AppRole>("rbt");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const [clientRes, staffRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase
        .from("client_staff")
        .select("*, profile:profiles(full_name)")
        .eq("client_id", clientId),
    ]);
    setClient(clientRes.data);
    setStaff((staffRes.data as any) ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAdding(true);

    const { data: found } = await supabase
      .from("profiles")
      .select("id, full_name")
      .ilike("full_name", `%${searchName}%`)
      .limit(1)
      .single();

    if (!found) {
      setAddError("No user found with that name. They need to create an account first.");
      setAdding(false);
      return;
    }

    const existing = staff.find((s) => s.user_id === found.id);
    if (existing) {
      setAddError("This person is already on the team.");
      setAdding(false);
      return;
    }

    await supabase.from("client_staff").insert({
      client_id: clientId,
      user_id: found.id,
      relationship: role,
    });

    setSearchName("");
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
                  {isBCBA && (
                    <Button variant="ghost" size="sm" onClick={() => removeMember(s.id)}>
                      ✕
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Team Member — BCBAs only for this client */}
      {isBCBA && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Add Team Member</p>
            <form onSubmit={addMember} className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Search by Name</Label>
                <Input
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Enter person's name..."
                  required
                />
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs">Their Role</Label>
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
      )}

      {!isBCBA && (
        <p className="text-sm text-muted-foreground italic">
          Only the BCBA for this client can add or remove team members.
        </p>
      )}
    </div>
  );
}
