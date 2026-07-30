import { z } from "zod";
import { WorkflowHttpError } from "./errors";

const positionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const workflowNodeSchema = z
  .object({
    id: z.string().min(1).max(200),
    type: z.string().max(100).optional(),
    position: positionSchema,
    data: z
      .object({
        nodeType: z.string().min(1).max(100),
        title: z.string().max(300).optional(),
        description: z.string().max(10_000).optional(),
        config: z.unknown().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const workflowEdgeSchema = z
  .object({
    id: z.string().min(1).max(300),
    source: z.string().min(1).max(200),
    target: z.string().min(1).max(200),
    sourceHandle: z.string().max(100).nullable().optional(),
    targetHandle: z.string().max(100).nullable().optional(),
    label: z.union([z.string(), z.number()]).nullable().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const workflowGraphSchema = z
  .object({
    nodes: z.array(workflowNodeSchema).max(250),
    edges: z.array(workflowEdgeSchema).max(1_000),
  })
  .superRefine(({ nodes, edges }, context) => {
    const nodeIds = new Set<string>();
    for (const node of nodes) {
      if (nodeIds.has(node.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate node id: ${node.id}`,
          path: ["nodes"],
        });
      }
      nodeIds.add(node.id);
    }

    for (const edge of edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        context.addIssue({
          code: "custom",
          message: `Edge ${edge.id} references a missing node.`,
          path: ["edges"],
        });
      }
    }

    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const outgoing = new Map<string, string[]>();
    for (const edge of edges) {
      outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge.target]);
    }
    const bxrNodeTypes = new Set([
      "bxr-session-notes",
      "bxr-reports",
      "bxr-session-data",
    ]);
    const externalNodeTypes = new Set(["agent", "mcp", "extract", "firecrawl", "http"]);
    for (const source of nodes.filter((node) => bxrNodeTypes.has(node.data.nodeType))) {
      const queue = (outgoing.get(source.id) || []).map((id) => ({
        id,
        approved: false,
      }));
      const visited = new Set<string>();
      while (queue.length > 0) {
        const current = queue.shift()!;
        const visitKey = `${current.id}:${current.approved}`;
        if (visited.has(visitKey)) continue;
        visited.add(visitKey);
        const target = nodesById.get(current.id);
        if (!target) continue;
        const approved =
          current.approved || target.data.nodeType === "user-approval";
        if (!approved && externalNodeTypes.has(target.data.nodeType)) {
          context.addIssue({
            code: "custom",
            message: `${source.data.nodeType} must pass through User Approval before external ${target.data.nodeType} nodes.`,
            path: ["edges"],
          });
          break;
        }
        for (const nextId of outgoing.get(target.id) || []) {
          queue.push({ id: nextId, approved });
        }
      }
    }
  });

export const createWorkflowSchema = workflowGraphSchema.extend({
  name: z.string().trim().min(1).max(200).default("Untitled workflow"),
  description: z.string().max(5_000).default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export const updateWorkflowSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5_000).optional(),
    nodes: z.array(workflowNodeSchema).max(250).optional(),
    edges: z.array(workflowEdgeSchema).max(1_000).optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one workflow field is required.",
  });

export const runWorkflowSchema = z.object({
  input: z.unknown().default({}).refine(
    (value) => JSON.stringify(value).length <= 250_000,
    "Workflow input is too large.",
  ),
});

export const workflowSecretSchema = z.object({
  provider: z.enum(["openai", "anthropic", "groq", "firecrawl", "mcp", "e2b"]),
  secret: z.string().trim().min(8).max(20_000),
});

export const approvalSchema = z.object({
  approved: z.boolean(),
  output: z.unknown().optional(),
  note: z.string().max(5_000).optional(),
});

export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new WorkflowHttpError(400, "Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Invalid request.";
    throw new WorkflowHttpError(400, message);
  }

  return parsed.data;
}
