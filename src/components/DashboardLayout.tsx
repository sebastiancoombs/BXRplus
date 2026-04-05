import { useState } from "react";
import {
  ChevronRight,
  FileText,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClientOverallReport } from "@/components/ClientOverallReport";
import { GoalCards, defaultReports, type Goal } from "@/components/GoalCards";
import type { GoalSectionContent } from "@/components/GoalReportPage";
import { GoalReportPage } from "@/components/GoalReportPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface Client {
  id: string;
  name: string;
  caseCount: number;
}

export interface Case {
  id: string;
  clientId: string;
  title: string;
  status: "active" | "pending" | "closed";
  lastUpdated: string;
}

export interface DashboardLayoutProps {
  clients?: Client[];
  cases?: Case[];
  selectedClientId?: string;
  onClientSelect?: (clientId: string) => void;
  className?: string;
}

const defaultClients: Client[] = [
  { id: "1", name: "Mason K.", caseCount: 2 },
  { id: "2", name: "Jordan T.", caseCount: 1 },
  { id: "3", name: "Avery L.", caseCount: 2 },
];

/** Cases = reports/documents per client (how BCBAs track authorization periods or report deadlines). */
const defaultCases: Case[] = [
  { id: "c1", clientId: "1", title: "Initial Treatment Plan (ITP)", status: "active", lastUpdated: "2025-01-15" },
  { id: "c2", clientId: "1", title: "6-Month Progress Report", status: "active", lastUpdated: "2025-02-15" },
  { id: "c3", clientId: "2", title: "Initial Treatment Plan (ITP)", status: "active", lastUpdated: "2025-02-01" },
  { id: "c4", clientId: "3", title: "Quarterly Progress Report", status: "active", lastUpdated: "2025-02-10" },
  { id: "c5", clientId: "3", title: "Annual Review", status: "active", lastUpdated: "2025-03-01" },
];

function getStatusColor(status: Case["status"]) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "closed":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

export function DashboardLayout({
  clients = defaultClients,
  cases = defaultCases,
  selectedClientId,
  onClientSelect,
  className,
}: DashboardLayoutProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string>(
    clients[0]?.id ?? ""
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedGoalForReport, setSelectedGoalForReport] = useState<{
    goal: Goal;
    reportName: string;
  } | null>(null);
  const [clientTab, setClientTab] = useState<"goals" | "overall">("goals");
  const [goalSections, setGoalSections] = useState<Record<string, GoalSectionContent>>({});
  const [overallLatexByClient, setOverallLatexByClient] = useState<Record<string, string>>({});

  const activeClientId = selectedClientId ?? internalSelectedId;

  const handleSectionContentChange = (goalId: string, content: GoalSectionContent) => {
    setGoalSections((prev) => ({ ...prev, [goalId]: content }));
  };

  const handleOverallLatexChange = (latex: string | null) => {
    if (activeClientId) {
      setOverallLatexByClient((prev) => {
        const next = { ...prev };
        if (latex === null) delete next[activeClientId];
        else next[activeClientId] = latex;
        return next;
      });
    }
  };

  const handleClientSelect = (clientId: string) => {
    if (selectedClientId === undefined) {
      setInternalSelectedId(clientId);
    }
    onClientSelect?.(clientId);
    setMobileMenuOpen(false);
  };

  const selectedClient = clients.find((c) => c.id === activeClientId);
  const clientCases = cases.filter((c) => c.clientId === activeClientId);
  const reportsForClient = defaultReports.filter(
    (r) => r.clientId === activeClientId
  );

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            ABA
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground">BCBA Dashboard</h2>
              <p className="text-xs text-muted-foreground">
                Reports by client
              </p>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <nav
          className="p-2"
          role="navigation"
          aria-label="Client navigation"
        >
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clients
              </div>
            )}
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => handleClientSelect(client.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  activeClientId === client.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
                aria-current={activeClientId === client.id ? "page" : undefined}
                title={sidebarCollapsed ? client.name : undefined}
              >
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                {!sidebarCollapsed && (
                  <>
                    <span className="min-w-0 flex-1 truncate text-left">
                      {client.name}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs" title="Number of reports">
                      {client.caseCount}
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        </nav>
      </ScrollArea>

      <div className="border-t border-border p-2">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          title={sidebarCollapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden />
          {!sidebarCollapsed && <span>Settings</span>}
        </button>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "flex h-screen bg-background text-foreground",
        className
      )}
    >
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "hidden flex-col border-r border-border bg-card transition-all duration-300 lg:flex",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
        aria-label="Sidebar navigation"
      >
        <SidebarContent />
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "border-t border-border p-2 transition-colors hover:bg-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          )}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
        >
          <ChevronRight
            className={cn(
              "mx-auto h-5 w-5 transition-transform",
              sidebarCollapsed ? "" : "rotate-180"
            )}
            aria-hidden
          />
        </button>
      </aside>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Mobile sidebar navigation"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold text-foreground">Menu</h2>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-md p-2 transition-colors hover:bg-accent"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <SidebarContent />
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-border bg-card">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-md p-2 transition-colors hover:bg-accent lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {selectedClient?.name ?? "Select a client"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {reportsForClient.length}{" "}
                  {reportsForClient.length === 1 ? "report" : "reports"}
                  {clientCases.length > 0 &&
                    ` · ${clientCases.length} ${clientCases.length === 1 ? "case" : "cases"}`}
                </p>
              </div>
            </div>
            <Button variant="default" size="sm">
              <FileText className="mr-2 h-4 w-4" aria-hidden />
              New report
            </Button>
          </div>
        </header>

        <ScrollArea className="min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            {selectedGoalForReport ? (
              <GoalReportPage
                key={selectedGoalForReport.goal.id}
                goal={selectedGoalForReport.goal}
                reportName={selectedGoalForReport.reportName}
                onBack={() => setSelectedGoalForReport(null)}
                sectionContent={goalSections[selectedGoalForReport.goal.id]}
                onSectionContentChange={handleSectionContentChange}
              />
            ) : selectedClient ? (
              <div className="flex h-full flex-col">
                <Tabs
                  value={clientTab}
                  onValueChange={(v) => setClientTab(v as "goals" | "overall")}
                  className="flex flex-1 flex-col overflow-hidden"
                >
                  <div className="border-b border-border bg-card px-4 py-2">
                    <TabsList className="w-full max-w-md">
                      <TabsTrigger value="goals" className="flex-1">
                        Goals by report
                      </TabsTrigger>
                      <TabsTrigger value="overall" className="flex-1">
                        Overall report
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent
                    value="goals"
                    className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
                  >
                    <ScrollArea className="min-h-0 flex-1 overflow-hidden">
                      <div className="space-y-6 p-6">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-lg border border-border bg-card p-4">
                            <div className="text-sm font-medium text-muted-foreground">
                              Active reports
                            </div>
                            <div className="mt-1 text-2xl font-bold text-foreground">
                              {
                                clientCases.filter((c) => c.status === "active")
                                  .length
                              }
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-card p-4">
                            <div className="text-sm font-medium text-muted-foreground">
                              Pending
                            </div>
                            <div className="mt-1 text-2xl font-bold text-foreground">
                              {
                                clientCases.filter((c) => c.status === "pending")
                                  .length
                              }
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-card p-4">
                            <div className="text-sm font-medium text-muted-foreground">
                              Closed
                            </div>
                            <div className="mt-1 text-2xl font-bold text-foreground">
                              {
                                clientCases.filter((c) => c.status === "closed")
                                  .length
                              }
                            </div>
                          </div>
                        </div>

                        <div>
                          <h2 className="mb-4 text-lg font-semibold text-foreground">
                            Reports / cases
                          </h2>
                          <div className="space-y-3">
                            {clientCases.length > 0 ? (
                              clientCases.map((caseItem) => (
                                <div
                                  key={caseItem.id}
                                  className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="min-w-0 flex-1">
                                      <h3 className="truncate font-medium text-foreground">
                                        {caseItem.title}
                                      </h3>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        Last updated:{" "}
                                        {new Date(
                                          caseItem.lastUpdated
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <span
                                      className={cn(
                                        "ml-4 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                                        getStatusColor(caseItem.status)
                                      )}
                                    >
                                      {caseItem.status}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-12 text-center text-muted-foreground">
                                No reports for this client
                              </div>
                            )}
                          </div>
                        </div>

                        {reportsForClient.length > 0 ? (
                          <GoalCards
                            reports={reportsForClient}
                            onGoalClick={(goal, reportName) =>
                              setSelectedGoalForReport({ goal, reportName })
                            }
                          />
                        ) : null}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent
                    value="overall"
                    className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
                  >
                    <ClientOverallReport
                      clientName={selectedClient.name}
                      reports={reportsForClient}
                      goalSectionContent={goalSections}
                      latexOverride={overallLatexByClient[activeClientId] ?? null}
                      onLatexChange={handleOverallLatexChange}
                      onGoalClick={(goal, reportName) =>
                        setSelectedGoalForReport({ goal, reportName })
                      }
                    />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users
                    className="mx-auto mb-4 h-12 w-12 opacity-50"
                    aria-hidden
                  />
                  <p>Select a client from the sidebar to view cases and goals</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
