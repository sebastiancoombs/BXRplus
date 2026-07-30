import { describe, expect, it, vi } from "vitest";
import { workflowGraphSchema } from "./schema";

vi.mock("server-only", () => ({}));

const node = (
  id: string,
  nodeType: string,
  config?: Record<string, unknown>,
) => ({
  id,
  type: "agentNode",
  position: { x: 0, y: 0 },
  data: {
    nodeType,
    title: nodeType,
    description: "",
    config,
  },
});

const edge = (
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
) => ({ id, source, target, sourceHandle });

describe("workflow graph validation", () => {
  it("accepts a connected React Flow graph", () => {
    const parsed = workflowGraphSchema.safeParse({
      nodes: [node("start", "start"), node("end", "end")],
      edges: [edge("edge-1", "start", "end")],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects edges pointing to missing nodes", () => {
    const parsed = workflowGraphSchema.safeParse({
      nodes: [node("start", "start")],
      edges: [edge("edge-1", "start", "missing")],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires approval before BXR+ clinical data reaches external nodes", () => {
    const unsafe = workflowGraphSchema.safeParse({
      nodes: [
        node("data", "bxr-session-notes"),
        node("agent", "agent"),
      ],
      edges: [edge("edge-1", "data", "agent")],
    });
    expect(unsafe.success).toBe(false);

    const approved = workflowGraphSchema.safeParse({
      nodes: [
        node("data", "bxr-session-notes"),
        node("approval", "user-approval"),
        node("agent", "agent"),
      ],
      edges: [
        edge("edge-1", "data", "approval"),
        edge("edge-2", "approval", "agent"),
      ],
    });
    expect(approved.success).toBe(true);
  });
});

describe("LangGraph workflow adapter", () => {
  it("runs package-backed state nodes end to end", async () => {
    const { invokeWorkflowGraph } = await import("./graph");
    const result = await invokeWorkflowGraph({
      nodes: [
        node("start", "start"),
        node("state", "set-state", {
          stateKey: "result",
          stateValue: "saved",
        }),
        node("end", "end"),
      ],
      edges: [
        edge("edge-1", "start", "state"),
        edge("edge-2", "state", "end"),
      ],
      input: { value: 1 },
    });

    expect(result.variables.result).toBe("saved");
    expect(result.completedNodeIds).toEqual(
      expect.arrayContaining(["start", "state", "end"]),
    );
  });

  it("uses JSON Logic to select conditional branches", async () => {
    const { invokeWorkflowGraph } = await import("./graph");
    const completed: string[] = [];
    const result = await invokeWorkflowGraph({
      nodes: [
        node("start", "start"),
        node("condition", "if-else", {
          rule: { "==": [{ var: "input.enabled" }, true] },
        }),
        node("yes", "end"),
        node("no", "end"),
      ],
      edges: [
        edge("edge-1", "start", "condition"),
        edge("edge-2", "condition", "yes", "true"),
        edge("edge-3", "condition", "no", "false"),
      ],
      input: { enabled: true },
      callbacks: {
        onNodeComplete: async (completedNode) => {
          completed.push(completedNode.id);
        },
      },
    });

    expect(completed).toContain("yes");
    expect(completed).not.toContain("no");
    expect(result.routes.condition).toBe("true");
  });

  it("pauses at approval nodes", async () => {
    const { invokeWorkflowGraph } = await import("./graph");
    await expect(
      invokeWorkflowGraph({
        nodes: [
          node("start", "start"),
          node("approval", "user-approval", { message: "Approve?" }),
          node("end", "end"),
        ],
        edges: [
          edge("edge-1", "start", "approval"),
          edge("edge-2", "approval", "end"),
        ],
        input: {},
      }),
    ).rejects.toMatchObject({
      name: "ApprovalRequiredError",
      nodeId: "approval",
    });
  });
});
