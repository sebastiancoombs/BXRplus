import type { Goal, Report } from "@/components/GoalCards";
import type { GoalSectionContent } from "@/components/GoalReportPage";

export type { GoalSectionContent };

/**
 * Escapes LaTeX special characters in plain text for use inside document body.
 */
function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (c) => `\\${c}`)
    .replace(/\n/g, "\n"); // keep newlines for paragraphs
}

/**
 * Builds a full LaTeX document from reports and per-goal section content.
 * Pulls from individual section areas (insurance, talking points, implementation) per goal.
 */
export function buildLatexReport(
  clientName: string,
  reports: Report[],
  getSectionContent: (goal: Goal) => GoalSectionContent
): string {
  const lines: string[] = [
    "\\documentclass[11pt]{article}",
    "\\usepackage[margin=1in]{geometry}",
    "\\usepackage{parskip}",
    "\\usepackage{enumitem}",
    "\\title{Progress Report -- " + escapeLatex(clientName) + "}",
    "\\date{}",
    "\\begin{document}",
    "\\maketitle",
    "",
  ];

  for (const report of reports) {
    lines.push("\\section{" + escapeLatex(report.name) + "}");
    lines.push("");

    for (const goal of report.goals) {
      const content = getSectionContent(goal);
      lines.push("\\subsection{" + escapeLatex(goal.title) + "}");
      lines.push("");
      lines.push("\\subsubsection*{Goal details (insurance-focused)}");
      lines.push(escapeLatex(content.insurance.trim()));
      lines.push("");
      lines.push("\\subsubsection*{Talking points}");
      lines.push(escapeLatex(content.talkingPoints.trim()));
      lines.push("");
      lines.push("\\subsubsection*{Implementation -- RBTs \\& parent training}");
      lines.push(escapeLatex(content.implementation.trim()));
      lines.push("");
    }
  }

  lines.push("\\end{document}");
  return lines.join("\n");
}
