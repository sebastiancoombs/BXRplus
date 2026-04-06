import { useState } from "react";
import { useClientDetail } from "@/hooks/useClients";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6"];
type DateRange = "7d" | "30d" | "90d" | "all";

export default function DataTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { behaviors, transactions, loading } = useClientDetail(clientId);
  const [range, setRange] = useState<DateRange>("30d");
  const [filterBehavior, setFilterBehavior] = useState<string>("all");

  if (loading) return <p className="text-muted-foreground">Loading data...</p>;

  const now = Date.now();
  const rangeMs: Record<DateRange, number> = { "7d": 7 * 86400000, "30d": 30 * 86400000, "90d": 90 * 86400000, "all": Infinity };
  const filtered = transactions.filter((t) => now - new Date(t.created_at).getTime() < rangeMs[range]);
  const behaviorFiltered = filterBehavior === "all" ? filtered : filtered.filter((t) => t.behavior_id === filterBehavior || (filterBehavior === "debits" && t.type === "debit"));

  const totalCredits = filtered.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalDebits = filtered.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);

  const behaviorTotals = new Map<string, { name: string; icon: string; points: number; count: number }>();
  filtered.filter((t) => t.type === "credit" && t.behavior).forEach((t) => {
    const key = t.behavior_id ?? "unknown";
    const prev = behaviorTotals.get(key) ?? { name: t.behavior?.name ?? "Unknown", icon: t.behavior?.icon ?? "⭐", points: 0, count: 0 };
    prev.points += t.amount;
    prev.count += 1;
    behaviorTotals.set(key, prev);
  });
  const barData = Array.from(behaviorTotals.values()).sort((a, b) => b.points - a.points);

  const rewardTotals = new Map<string, { name: string; icon: string; count: number; points: number }>();
  filtered.filter((t) => t.type === "debit" && t.reward).forEach((t) => {
    const key = t.reward_id ?? "unknown";
    const prev = rewardTotals.get(key) ?? { name: t.reward?.name ?? "Unknown", icon: t.reward?.icon ?? "🎁", count: 0, points: 0 };
    prev.count += 1;
    prev.points += t.amount;
    rewardTotals.set(key, prev);
  });
  const pieData = Array.from(rewardTotals.values());

  const dailyMap = new Map<string, { date: string; earned: number; spent: number }>();
  filtered.forEach((t) => {
    const day = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const prev = dailyMap.get(day) ?? { date: day, earned: 0, spent: 0 };
    if (t.type === "credit") prev.earned += t.amount;
    else prev.spent += t.amount;
    dailyMap.set(day, prev);
  });
  const timelineData = Array.from(dailyMap.values()).reverse();

  const behaviorCountDailyMap = new Map<string, { date: string; count: number }>();
  filtered
    .filter((t) => t.type === "credit" && t.behavior_id && (filterBehavior === "all" || t.behavior_id === filterBehavior))
    .forEach((t) => {
      const day = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const prev = behaviorCountDailyMap.get(day) ?? { date: day, count: 0 };
      prev.count += 1;
      behaviorCountDailyMap.set(day, prev);
    });
  const behaviorCountLineData = Array.from(behaviorCountDailyMap.values()).reverse();

  function exportCSV() {
    const rows = behaviorFiltered.map((t) => ({
      Date: new Date(t.created_at).toISOString(),
      Type: t.type,
      Description: t.type === "credit" ? (t.behavior?.name ?? "Points awarded") : (t.reward?.name ?? "Reward redeemed"),
      Amount: t.type === "credit" ? t.amount : -t.amount,
      Balance: t.balance_after,
      Note: t.note ?? "",
    }));
    const headers = Object.keys(rows[0] ?? {});
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `${(r as any)[h] ?? ""}`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${clientName.replace(/\s+/g, "_")}_data_${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border bg-gradient-to-br from-background via-background to-primary/5 p-5 md:p-7 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Progress Review</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Progress & Outcomes</h2>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex rounded-xl border overflow-hidden flex-shrink-0 bg-card">
              {(["7d", "30d", "90d", "all"] as DateRange[]).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={cn("px-3 py-2 text-xs font-medium transition-colors", range === r ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>{r === "all" ? "All time" : r}</button>
              ))}
            </div>
            <select value={filterBehavior} onChange={(e) => setFilterBehavior(e.target.value)} className="rounded-xl border border-input bg-card px-3 py-2 text-xs h-9">
              <option value="all">All activity</option>
              <option value="debits">Rewards redeemed</option>
              {behaviors.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.name}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={behaviorFiltered.length === 0} className="h-9">Download CSV</Button>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 xl:grid-cols-4 mt-6">
          <MetricCard label="Points earned" value={`+${totalCredits}`} className="text-green-600" />
          <MetricCard label="Points spent/removed" value={`−${totalDebits}`} className="text-red-500" />
          <MetricCard label="Point events" value={`${filtered.filter((t) => t.type === "credit").length}`} />
          <MetricCard label="Reward events" value={`${filtered.filter((t) => t.type === "debit").length}`} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {timelineData.length > 1 && (
          <ChartCard title="Points Over Time">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="earned" stroke="#22c55e" strokeWidth={2} name="Earned" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="spent" stroke="#ef4444" strokeWidth={2} name="Spent" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {behaviorCountLineData.length > 0 && (
          <ChartCard title="Behavior Count by Day">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={behaviorCountLineData}>
                <defs>
                  <linearGradient id="behaviorCountFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => [`${val}`, "Behavior count"]} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  name="Behavior count"
                  dot={{ r: 3, fill: "#8b5cf6" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {barData.length > 0 && (
          <ChartCard title="Points by Behavior">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(val: number) => [`${val} pts`, "Points"]} />
                <Bar dataKey="points" radius={[0, 4, 4, 0]}>{barData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {pieData.length > 0 && (
          <ChartCard title="Reward Redemptions">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val: number, name: string) => [`${val} times`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-2xl bg-card border px-4 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-3xl font-extrabold mt-1 ${className}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-sm font-medium text-muted-foreground mb-4">{title}</p>
        {children}
      </CardContent>
    </Card>
  );
}
