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
  name: string;
  goals: Goal[];
}

export interface GoalCardsProps {
  reports?: Report[];
  onGoalClick?: (goalId: string) => void;
}

const defaultReports: Report[] = [
  {
    id: "1",
    name: "Q1 2024 Objectives",
    goals: [
      {
        id: "1-1",
        title: "Increase user engagement by 25%",
        description:
          "Focus on improving user retention through enhanced onboarding and feature discovery",
        status: "Reviewed",
      },
      {
        id: "1-2",
        title: "Launch mobile application",
        description: "Complete development and release iOS and Android apps",
        status: "In Progress",
      },
      {
        id: "1-3",
        title: "Expand to European markets",
        status: "Removed",
      },
    ],
  },
  {
    id: "2",
    name: "Product Development Goals",
    goals: [
      {
        id: "2-1",
        title: "Implement AI-powered recommendations",
        description:
          "Integrate machine learning algorithms to provide personalized content suggestions",
        status: "In Progress",
      },
      {
        id: "2-2",
        title: "Redesign dashboard interface",
        description:
          "Modernize UI/UX with improved accessibility and responsiveness",
        status: "Reviewed",
      },
      {
        id: "2-3",
        title: "Add real-time collaboration features",
        description:
          "Enable multiple users to work simultaneously on shared documents",
        status: "In Progress",
      },
    ],
  },
  {
    id: "3",
    name: "Marketing Initiatives",
    goals: [
      {
        id: "3-1",
        title: "Launch content marketing campaign",
        description:
          "Create and distribute high-quality blog posts and video content",
        status: "Reviewed",
      },
      {
        id: "3-2",
        title: "Partner with industry influencers",
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

  const handleGoalClick = (goalId: string) => {
    setSelectedGoal(goalId);
    onGoalClick(goalId);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Goals Overview</h1>
        <p className="text-muted-foreground">
          Track and manage your organizational goals across different reports
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
                  onClick={() => handleGoalClick(goal.id)}
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
