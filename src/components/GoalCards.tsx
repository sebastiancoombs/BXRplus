import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: "Reviewed" | "In Progress" | "Removed";
}

export interface Report {
  id: string;
  clientId: string;
  name: string;
  goals: Goal[];
}

export interface GoalCardsProps {
  reports?: Report[];
  onGoalClick?: (goal: Goal, reportName: string) => void;
}

/** Sample reports and goals as BCBAs write them: one report = one document (e.g. ITP, 6-mo progress); goals have objective + operational definition. */
export const defaultReports: Report[] = [
  {
    id: "r1",
    clientId: "1",
    name: "Initial Treatment Plan (ITP)",
    goals: [
      {
        id: "r1-g1",
        title: "Mand for preferred items (vocal or AAC)",
        description:
          "Client will independently request at least 5 preferred items per session using a vocal word approximation or AAC device within 5 s of the opportunity, in 80% of opportunities across 3 consecutive sessions and 2 settings.",
        status: "In Progress",
      },
      {
        id: "r1-g2",
        title: "Tolerate non-preferred activity (3 min)",
        description:
          "Client will remain in a non-preferred activity for 3 min without elopement, aggression, or property destruction, given a first-then visual and one redirect, in 80% of opportunities across 3 consecutive sessions.",
        status: "In Progress",
      },
      {
        id: "r1-g3",
        title: "Follow 2-step gross-motor instructions",
        description:
          "Client will complete a 2-step gross-motor instruction (e.g., “Clap then jump”) within 5 s of the SD, in 80% of opportunities across 3 consecutive sessions.",
        status: "Reviewed",
      },
    ],
  },
  {
    id: "r2",
    clientId: "1",
    name: "6-Month Progress Report",
    goals: [
      {
        id: "r2-g1",
        title: "Mand for preferred items (vocal or AAC)",
        description:
          "Client will independently request at least 5 preferred items per session using a vocal word approximation or AAC device within 5 s of the opportunity, in 80% of opportunities across 3 consecutive sessions and 2 settings.",
        status: "In Progress",
      },
      {
        id: "r2-g2",
        title: "Accept “no” or 30 s delay",
        description:
          "Client will accept “no” or a 30 s delay to a preferred item without problem behavior (aggression, property destruction, or elopement), in 80% of opportunities across 2 settings.",
        status: "In Progress",
      },
      {
        id: "r2-g3",
        title: "Turn-taking with one peer (2 exchanges)",
        description:
          "Client will take 2 turns with one peer in a shared activity (e.g., ball, puzzle) with no more than 1 verbal prompt per turn, in 80% of opportunities across 3 sessions. Mastered; moved to maintenance.",
        status: "Removed",
      },
    ],
  },
  {
    id: "r3",
    clientId: "2",
    name: "Initial Treatment Plan (ITP)",
    goals: [
      {
        id: "r3-g1",
        title: "Remain in designated area (no elopement)",
        description:
          "Client will remain within arm’s reach of the supervising adult during group or table activities for 10 min with no more than 1 gestural prompt, in 80% of opportunities across 3 consecutive sessions.",
        status: "In Progress",
      },
      {
        id: "r3-g2",
        title: "Accept “no” or delay for preferred item",
        description:
          "Client will accept denial or 30 s delay to a preferred item without problem behavior, in 80% of opportunities across 2 settings.",
        status: "Reviewed",
      },
      {
        id: "r3-g3",
        title: "Imitate 5 novel motor actions",
        description:
          "Client will imitate a novel motor action within 5 s of the model (e.g., touch nose, wave) in 4 of 5 trials per session across 3 consecutive sessions.",
        status: "In Progress",
      },
    ],
  },
  {
    id: "r4",
    clientId: "3",
    name: "Quarterly Progress Report",
    goals: [
      {
        id: "r4-g1",
        title: "Respond to name (orient within 3 s)",
        description:
          "Client will orient toward the speaker or make eye contact within 3 s of name call in 90% of opportunities across 2 settings.",
        status: "Reviewed",
      },
      {
        id: "r4-g2",
        title: "Match identical objects/pictures (field of 4)",
        description:
          "Client will match 10 target items to an identical sample in a field of 4 with 90% accuracy across 3 consecutive sessions.",
        status: "In Progress",
      },
      {
        id: "r4-g3",
        title: "Request break (card or vocalization)",
        description:
          "Client will hand a break card or emit the vocalization “break” before leaving the work area when the break option is presented, in 80% of opportunities.",
        status: "In Progress",
      },
    ],
  },
  {
    id: "r5",
    clientId: "3",
    name: "Annual Review",
    goals: [
      {
        id: "r5-g1",
        title: "Respond to name (orient within 3 s)",
        description:
          "Client will orient toward the speaker or make eye contact within 3 s of name call in 90% of opportunities across 2 settings.",
        status: "Reviewed",
      },
      {
        id: "r5-g2",
        title: "Match identical objects/pictures (field of 4)",
        description:
          "Client will match 10 target items to an identical sample in a field of 4 with 90% accuracy across 3 consecutive sessions.",
        status: "In Progress",
      },
      {
        id: "r5-g3",
        title: "Request break (card or vocalization)",
        description:
          "Client will hand a break card or emit “break” before leaving the work area when the break option is presented, in 80% of opportunities.",
        status: "In Progress",
      },
      {
        id: "r5-g4",
        title: "Toilet training – sit on toilet 2 min",
        description:
          "Client will sit on the toilet for 2 min when scheduled. Discontinued this quarter per family request; to be revisited next authorization period.",
        status: "Removed",
      },
    ],
  },
];

function getStatusConfig(status: Goal["status"]) {
  switch (status) {
    case "Reviewed":
      return {
        icon: CheckCircle2,
        variant: "default" as const,
        className:
          "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
      };
    case "In Progress":
      return {
        icon: Clock,
        variant: "secondary" as const,
        className:
          "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
      };
    case "Removed":
      return {
        icon: XCircle,
        variant: "destructive" as const,
        className:
          "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
      };
  }
}

export const GoalCards: React.FC<GoalCardsProps> = ({
  reports = defaultReports,
  onGoalClick = () => {},
}) => {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const handleGoalClick = (goal: Goal, reportName: string) => {
    setSelectedGoal(goal.id);
    onGoalClick(goal, reportName);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Goals by report
        </h2>
        <p className="text-sm text-muted-foreground">
          Click a goal to build or edit its report section
        </p>
      </div>

      {reports.map((report) => (
        <div key={report.id} className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">
              {report.name}
            </h2>
            <Badge variant="outline" className="text-xs">
              {report.goals.length}{" "}
              {report.goals.length === 1 ? "goal" : "goals"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.goals.map((goal) => {
              const statusConfig = getStatusConfig(goal.status);
              const StatusIcon = statusConfig.icon;
              const isSelected = selectedGoal === goal.id;

              return (
                <Card
                  key={goal.id}
                  className={cn(
                    "p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-border",
                    isSelected && "ring-2 ring-primary shadow-md"
                  )}
                  onClick={() => handleGoalClick(goal, report.name)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground leading-tight flex-1">
                        {goal.title}
                      </h3>
                      <Badge
                        className={cn(
                          statusConfig.className,
                          "flex items-center gap-1 shrink-0"
                        )}
                      >
                        <StatusIcon className="w-3 h-3" aria-hidden />
                        <span className="text-xs">{goal.status}</span>
                      </Badge>
                    </div>

                    {goal.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {goal.description}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
