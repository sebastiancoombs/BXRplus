import { useMemo } from "react";
import { FileText, RefreshCw } from "lucide-react";
import type { Goal, Report } from "@/components/GoalCards";
import { buildLatexReport } from "@/lib/latex-report";
import type { GoalSectionContent } from "@/components/GoalReportPage";
import { buildImplementationDraft, buildInsuranceDraft, buildTalkingPointsDraft } from "@/components/GoalReportPage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

export interface ClientOverallReportProps {
  clientName: string;
  reports: Report[];
  /** Per-goal section content from individual section editors. Pulls into LaTeX when no override. */
  goalSectionContent: Record<string, GoalSectionContent>;
  /** When set, show this instead of generated LaTeX (e.g. after AI edit). */
  latexOverride: string | null;
  onLatexChange: (latex: string | null) => void;
  onGoalClick?: (goal: Goal, reportName: string) => void;
}

/**
 * Renders the overall report as editable LaTeX. Content is pulled from individual
 * goal section areas (insurance, talking points, implementation). AI can edit the LaTeX directly.
 */
export function ClientOverallReport({
  clientName,
  reports,
  goalSectionContent,
  latexOverride,
  onLatexChange,
}: ClientOverallReportProps) {
  const generatedLatex = useMemo(() => {
    const getSectionContent = (goal: Goal): GoalSectionContent => {
      const stored = goalSectionContent[goal.id];
      if (stored) return stored;
      return {
        insurance: buildInsuranceDraft(goal),
        talkingPoints: buildTalkingPointsDraft(goal),
        implementation: buildImplementationDraft(goal),
      };
    };
    return buildLatexReport(clientName, reports, getSectionContent);
  }, [clientName, reports, goalSectionContent]);

  const displayLatex = latexOverride ?? generatedLatex;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Overall report – {clientName}
          </h1>
          <p className="text-sm text-muted-foreground">
            LaTeX document built from each goal’s sections. Edit here for AI or export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onLatexChange(null)}
            className="gap-2"
            title="Regenerate from individual section areas"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate from sections
          </Button>
          <Button type="button" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Export .tex
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 overflow-hidden">
        <div className="p-4">
          <Label htmlFor="overall-latex" className="sr-only">
            Overall report LaTeX (editable)
          </Label>
          <Textarea
            id="overall-latex"
            value={displayLatex}
            onChange={(e) => onLatexChange(e.target.value)}
            className="min-h-[480px] font-mono text-sm leading-relaxed"
            placeholder="LaTeX document..."
            spellCheck={false}
            aria-label="Overall report LaTeX (editable)"
          />
        </div>
      </ScrollArea>
    </div>
  );
}
