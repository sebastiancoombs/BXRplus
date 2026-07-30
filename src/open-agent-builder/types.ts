export type BuilderNodeType =
  | "start"
  | "agent"
  | "mcp"
  | "if-else"
  | "while"
  | "user-approval"
  | "transform"
  | "extract"
  | "http"
  | "set-state"
  | "bxr-session-notes"
  | "bxr-reports"
  | "bxr-session-data"
  | "note"
  | "end";

export type BuilderNodeData = {
  nodeType: BuilderNodeType;
  title: string;
  description: string;
  config?: string;
};
