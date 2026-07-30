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
  | "note"
  | "end";

export type BuilderNodeData = {
  nodeType: BuilderNodeType;
  title: string;
  description: string;
  config?: string;
};
