import { useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Goal } from "@/components/GoalCards";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ProgressDataPoint {
  label: string;
  accuracy: number;
  target: number;
}

const DEFAULT_PROGRESS_DATA: ProgressDataPoint[] = [
  { label: "Week 1", accuracy: 45, target: 80 },
  { label: "Week 2", accuracy: 58, target: 80 },
  { label: "Week 3", accuracy: 72, target: 80 },
  { label: "Week 4", accuracy: 78, target: 80 },
  { label: "Week 5", accuracy: 85, target: 80 },
];

/**
 * Draft insurance-focused narrative from goal; editable by user.
 * Exported for use when building overall LaTeX from sections.
 */
export function buildInsuranceDraft(goal: Goal): string {
  const def = goal.description?.trim() ?? "Client will demonstrate the target skill under specified conditions.";
  return `Objective / Treatment goal
${goal.title}

Operational definition
${def}

Mastery criteria
Mastery is defined as meeting the above definition at 80% of opportunities across three consecutive sessions, in the absence of prompts, and across at least two settings or activities as applicable.

Current progress
Data collected during the reporting period indicate progress toward mastery. Continued authorization is medically necessary to achieve criterion and promote generalization and maintenance.`;
}

/** Draft talking points for meetings and reviews. */
export function buildTalkingPointsDraft(goal: Goal): string {
  return `• Goal: ${goal.title}
• Summary of current performance and trend
• Why this goal is medically necessary and aligns with treatment plan
• Barriers (if any) and adjustments made
• What’s needed from the team / family to support progress
• Recommended next steps or goal modification`;
}

/** Draft implementation guidance for RBTs and parent training. */
export function buildImplementationDraft(goal: Goal): string {
  return `RBT implementation (${goal.title})
• SD and response definition
• Prompt hierarchy and fading
• Reinforcement and error correction
• Data collection (what to record and when)
• Generalization and maintenance steps

Parent / caregiver training
• How to run the skill at home (brief steps)
• What to reinforce and what to avoid
• When to ask for support or schedule a parent session`;
}

export interface GoalSectionContent {
  insurance: string;
  talkingPoints: string;
  implementation: string;
}

export interface GoalReportPageProps {
  goal: Goal;
  reportName: string;
  onBack: () => void;
  /** Current section content from store (if any). */
  sectionContent?: GoalSectionContent | null;
  /** Persist section content so Overall Report LaTeX can pull from it. */
  onSectionContentChange?: (goalId: string, content: GoalSectionContent) => void;
}

export function GoalReportPage({
  goal,
  reportName,
  onBack,
  sectionContent,
  onSectionContentChange,
}: GoalReportPageProps) {
  const initialInsurance = sectionContent?.insurance ?? buildInsuranceDraft(goal);
  const initialTalkingPoints = sectionContent?.talkingPoints ?? buildTalkingPointsDraft(goal);
  const initialImplementation = sectionContent?.implementation ?? buildImplementationDraft(goal);

  const [insuranceText, setInsuranceText] = useState(initialInsurance);
  const [talkingPointsText, setTalkingPointsText] = useState(initialTalkingPoints);
  const [implementationText, setImplementationText] = useState(initialImplementation);
  const [progressData] = useState<ProgressDataPoint[]>(DEFAULT_PROGRESS_DATA);

  useEffect(() => {
    setInsuranceText(sectionContent?.insurance ?? buildInsuranceDraft(goal));
    setTalkingPointsText(sectionContent?.talkingPoints ?? buildTalkingPointsDraft(goal));
    setImplementationText(sectionContent?.implementation ?? buildImplementationDraft(goal));
  }, [goal.id, sectionContent?.insurance, sectionContent?.talkingPoints, sectionContent?.implementation]);

  const handleInsuranceChange = (value: string) => {
    setInsuranceText(value);
    onSectionContentChange?.(goal.id, {
      insurance: value,
      talkingPoints: talkingPointsText,
      implementation: implementationText,
    });
  };
  const handleTalkingPointsChange = (value: string) => {
    setTalkingPointsText(value);
    onSectionContentChange?.(goal.id, {
      insurance: insuranceText,
      talkingPoints: value,
      implementation: implementationText,
    });
  };
  const handleImplementationChange = (value: string) => {
    setImplementationText(value);
    onSectionContentChange?.(goal.id, {
      insurance: insuranceText,
      talkingPoints: talkingPointsText,
      implementation: value,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to goals"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Goal report – {reportName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Edit the report narrative; all sections are editable
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Export section
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Progress
              </CardTitle>
              <CardDescription>
                Accuracy vs target across sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={progressData}
                    margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fill: "var(--muted-foreground)" }}
                      domain={[0, 100]}
                    />
                    <Bar
                      dataKey="accuracy"
                      fill="var(--chart-1)"
                      radius={[4, 4, 0, 0]}
                      name="Accuracy %"
                    />
                    <Bar
                      dataKey="target"
                      fill="var(--chart-2)"
                      radius={[4, 4, 0, 0]}
                      name="Target %"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Goal details (insurance-focused)
              </CardTitle>
              <CardDescription>
                Clinical narrative for auth and progress reports. Edit to match your documentation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="insurance-editor" className="sr-only">
                Goal details narrative
              </Label>
              <Textarea
                id="insurance-editor"
                value={insuranceText}
                onChange={(e) => handleInsuranceChange(e.target.value)}
                placeholder="Objective, operational definition, mastery criteria, and current progress..."
                className="min-h-[220px] resize-y font-mono text-sm leading-relaxed"
                aria-label="Goal details narrative"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                Talking points
              </CardTitle>
              <CardDescription>
                Key points for meetings, auth reviews, or family conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="talking-points-editor" className="sr-only">
                Talking points
              </Label>
              <Textarea
                id="talking-points-editor"
                value={talkingPointsText}
                onChange={(e) => handleTalkingPointsChange(e.target.value)}
                placeholder="• Point one&#10;• Point two..."
                className="min-h-[160px] resize-y text-sm leading-relaxed"
                aria-label="Talking points"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Implementation — RBTs & parent training
              </CardTitle>
              <CardDescription>
                Procedures and guidance for direct staff and parent/caregiver training
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label htmlFor="implementation-editor" className="sr-only">
                Implementation for RBTs and parent training
              </Label>
              <Textarea
                id="implementation-editor"
                value={implementationText}
                onChange={(e) => handleImplementationChange(e.target.value)}
                placeholder="RBT implementation steps and parent training summary..."
                className="min-h-[200px] resize-y text-sm leading-relaxed"
                aria-label="Implementation for RBTs and parent training"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
