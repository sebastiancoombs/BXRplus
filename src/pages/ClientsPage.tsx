import { useState } from "react";
import { Link } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ClientsPage() {
  const { clients, loading, refresh } = useClients();
  const { profile } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [adding, setAdding] = useState(false);

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);

    const { data, error } = await supabase
      .from("clients")
      .insert({ full_name: newName, date_of_birth: newDob || null, avatar_url: null })
      .select()
      .single();

    if (!error && data && profile) {
      // Auto-assign creator as staff
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
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Clients</h1>
        <div className="flex gap-2">
          <Link to="/scan">
            <Button variant="outline">📷 Scan QR</Button>
          </Link>
          <Button onClick={() => setShowAdd(!showAdd)}>+ Add Client</Button>
        </div>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={addClient} className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Full Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={newDob} onChange={(e) => setNewDob(e.target.value)} />
              </div>
              <Button type="submit" disabled={adding}>
                {adding ? "Adding..." : "Add"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading clients...</p>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-4xl mb-4">👋</p>
            <p className="text-lg font-medium">No clients yet</p>
            <p>Add your first client to get started with the token economy.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} to={`/clients/${client.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{client.full_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-primary">
                      {client.balance}
                    </span>
                    <span className="text-sm text-muted-foreground">points</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
