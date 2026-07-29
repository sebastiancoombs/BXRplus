import { useState } from "react";
import { useClientDetail } from "@/hooks/useClients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrintableClientCard, PrintableRewardTicket } from "@/components/PrintableCard";

export default function PrintablesTab({ clientId, client }: { clientId: string; client: any }) {
  const { behaviors, rewards, loading } = useClientDetail(clientId);
  const [copies, setCopies] = useState(1);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  function handlePrintAll() {
    window.print();
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5 p-5 md:p-7 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Program Materials</p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Printables</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Create cards, reward tickets, and reference sheets that are ready to print and use in sessions.
        </p>
      </div>

      <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Print Everything</p>
            <p className="text-xs text-muted-foreground mt-1">Print the client card, reward tickets, and behavior reference in one step.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Copies</label>
              <Input type="number" min={1} max={20} value={copies} onChange={(e) => setCopies(Math.max(1, +e.target.value))} className="w-16 h-9 text-center" />
            </div>
            <Button onClick={handlePrintAll}>Print Full Pack</Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-semibold">Client Card</p>
          <p className="text-xs text-muted-foreground mt-1">Credit-card sized and easy to laminate.</p>
        </div>
        <PrintableClientCard client={client} />
      </section>

      {rewards.length > 0 && (
        <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm space-y-4">
          <div>
            <p className="text-sm font-semibold">Reward Tickets</p>
            <p className="text-xs text-muted-foreground mt-1">Printable reward choices that make goals visible and easy to redeem.</p>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => (
              <PrintableRewardTicket key={reward.id} reward={reward} client={client} />
            ))}
          </div>
        </section>
      )}

      {behaviors.length > 0 && (
        <section className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm space-y-4 max-w-2xl">
          <div>
            <p className="text-sm font-semibold">Behavior Reference Sheet</p>
            <p className="text-xs text-muted-foreground mt-1">A simple staff-facing reference for what adds or removes points.</p>
          </div>
          <Card className="max-w-xl shadow-none border">
            <CardContent className="py-0">
              <div className="py-3 border-b font-semibold text-sm">⭐ Behaviors for {client.full_name}</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase">
                    <th className="text-left py-2 font-medium">Behavior</th>
                    <th className="text-right py-2 font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {behaviors.map((behavior) => (
                    <tr key={behavior.id} className="border-t">
                      <td className="py-2">{behavior.icon} {behavior.name}</td>
                      <td className={`py-2 text-right font-semibold ${behavior.point_value >= 0 ? "text-green-600" : "text-red-500"}`}>{behavior.point_value > 0 ? "+" : ""}{behavior.point_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
