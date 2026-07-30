"use client";

import type { ComponentType } from "react";
import {
  Bot,
  Braces,
  CheckCircle2,
  FileText,
  GitBranch,
  Globe,
  MousePointer2,
  Play,
  Plug,
  Repeat2,
  Search,
  Server,
  StopCircle,
} from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { BuilderNodeData, BuilderNodeType } from "./types";
import styles from "./open-agent-builder.module.css";

type NodeVisual = {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  color: string;
  label: string;
};

export const nodeVisuals: Record<BuilderNodeType, NodeVisual> = {
  start: { icon: Play, color: "#71717a", label: "Start" },
  agent: { icon: MousePointer2, color: "#3b82f6", label: "Agent" },
  mcp: { icon: Plug, color: "#facc15", label: "MCP" },
  "if-else": { icon: GitBranch, color: "#fb923c", label: "Condition" },
  while: { icon: Repeat2, color: "#fb923c", label: "While" },
  "user-approval": { icon: CheckCircle2, color: "#9ca3af", label: "User approval" },
  transform: { icon: Braces, color: "#9665ff", label: "Transform" },
  extract: { icon: Search, color: "#9665ff", label: "Extract" },
  http: { icon: Server, color: "#9665ff", label: "HTTP" },
  "set-state": { icon: Braces, color: "#9665ff", label: "Set state" },
  note: { icon: FileText, color: "#a1a1aa", label: "Note" },
  end: { icon: StopCircle, color: "#14b8a6", label: "End" },
};

export const paletteIcons = {
  Bot,
  Globe,
};

export default function AgentNode({ data, selected }: NodeProps) {
  const typedData = data as BuilderNodeData;
  const visual = nodeVisuals[typedData.nodeType] || nodeVisuals.agent;
  const Icon = visual.icon;

  return (
    <div className={`${styles.agentNode} ${selected ? styles.agentNodeSelected : ""}`}>
      {typedData.nodeType !== "start" && (
        <Handle type="target" position={Position.Left} className={styles.handle} />
      )}
      <span className={styles.nodeIcon} style={{ backgroundColor: visual.color }}>
        <Icon size={15} strokeWidth={2.2} />
      </span>
      <span className={styles.nodeCopy}>
        <strong>{typedData.title || visual.label}</strong>
        {typedData.description && <small>{typedData.description}</small>}
      </span>
      {typedData.nodeType !== "end" && typedData.nodeType !== "note" && (
        <Handle type="source" position={Position.Right} className={styles.handle} />
      )}
    </div>
  );
}
