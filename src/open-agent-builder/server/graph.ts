import "server-only";

import {
  Annotation,
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import type { WorkflowEdge, WorkflowNode } from "./schema";
import {
  ApprovalRequiredError,
  executeWorkflowNode,
  type ExecutionState,
} from "./node-executors";

const WorkflowState = Annotation.Root({
  input: Annotation<unknown>(),
  lastOutput: Annotation<unknown>({
    reducer: (_, right) => right,
  }),
  variables: Annotation<Record<string, unknown>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  nodeOutputs: Annotation<Record<string, unknown>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  approvals: Annotation<
    Record<string, { approved: boolean; output?: unknown; note?: string }>
  >({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  iterations: Annotation<Record<string, number>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  routes: Annotation<Record<string, string>>({
    reducer: (left, right) => ({ ...left, ...right }),
    default: () => ({}),
  }),
  completedNodeIds: Annotation<string[]>({
    reducer: (left, right) => Array.from(new Set([...left, ...right])),
    default: () => [],
  }),
});

export type GraphState = typeof WorkflowState.State;

export type GraphCallbacks = {
  onNodeStart?: (node: WorkflowNode, state: GraphState) => Promise<void>;
  onNodeComplete?: (
    node: WorkflowNode,
    output: unknown,
    state: GraphState,
  ) => Promise<void>;
  onNodeFailure?: (node: WorkflowNode, error: unknown) => Promise<void>;
  onApprovalRequired?: (
    node: WorkflowNode,
    error: ApprovalRequiredError,
    state: GraphState,
  ) => Promise<void>;
};

function edgeRoute(edge: WorkflowEdge) {
  const data = edge.data as Record<string, unknown> | undefined;
  return String(
    edge.sourceHandle ||
      data?.branch ||
      data?.route ||
      edge.label ||
      "default",
  ).toLowerCase();
}

function chooseConditionalTarget(
  nodeId: string,
  edges: WorkflowEdge[],
  state: GraphState,
) {
  const route = String(state.routes[nodeId] || "default").toLowerCase();
  const matched = edges.find((edge) => edgeRoute(edge) === route);
  return matched?.target || edges[0]?.target || END;
}

export function buildWorkflowGraph(options: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  callbacks?: GraphCallbacks;
}) {
  const { nodes, edges, callbacks = {} } = options;
  // Workflow node IDs are user-defined at runtime, so LangGraph's compile-time
  // string-literal node map cannot represent them statically.
  const graph: any = new StateGraph(WorkflowState);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const executableNodes = nodes.filter(
    (node) => String(node.data.nodeType || node.type) !== "note",
  );

  for (const node of executableNodes) {
    graph.addNode(node.id, async (state: GraphState) => {
      if (state.completedNodeIds.includes(node.id)) {
        return {};
      }

      await callbacks.onNodeStart?.(node, state);

      try {
        const execution = await executeWorkflowNode(
          node,
          state as ExecutionState,
        );
        const nextState: Partial<GraphState> = {
          ...execution.state,
          nodeOutputs: { [node.id]: execution.output },
          completedNodeIds: [node.id],
        };
        if (execution.route) {
          nextState.routes = { [node.id]: execution.route };
        }

        await callbacks.onNodeComplete?.(node, execution.output, {
          ...state,
          ...nextState,
          variables: {
            ...state.variables,
            ...(nextState.variables || {}),
          },
          nodeOutputs: {
            ...state.nodeOutputs,
            ...(nextState.nodeOutputs || {}),
          },
          approvals: {
            ...state.approvals,
            ...(nextState.approvals || {}),
          },
          iterations: {
            ...state.iterations,
            ...(nextState.iterations || {}),
          },
          routes: {
            ...state.routes,
            ...(nextState.routes || {}),
          },
          completedNodeIds: Array.from(
            new Set([
              ...state.completedNodeIds,
              ...(nextState.completedNodeIds || []),
            ]),
          ),
        } as GraphState);
        return nextState;
      } catch (error) {
        if (error instanceof ApprovalRequiredError) {
          await callbacks.onApprovalRequired?.(node, error, state);
        } else {
          await callbacks.onNodeFailure?.(node, error);
        }
        throw error;
      }
    });
  }

  const executableIds = new Set(executableNodes.map((node) => node.id));
  const usableEdges = edges.filter(
    (edge) => executableIds.has(edge.source) && executableIds.has(edge.target),
  );
  const outgoing = new Map<string, WorkflowEdge[]>();
  const incomingCount = new Map<string, number>();

  for (const node of executableNodes) incomingCount.set(node.id, 0);
  for (const edge of usableEdges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge]);
    incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
  }

  for (const node of executableNodes) {
    const nodeType = String(node.data.nodeType || node.type);
    const nodeEdges = outgoing.get(node.id) || [];

    if (["if-else", "while"].includes(nodeType) && nodeEdges.length) {
      const pathMap = Object.fromEntries(
        nodeEdges.map((edge) => [edge.target, edge.target]),
      );
      graph.addConditionalEdges(
        node.id,
        (state: GraphState) =>
          chooseConditionalTarget(node.id, nodeEdges, state),
        pathMap,
      );
      continue;
    }

    if (nodeEdges.length) {
      for (const edge of nodeEdges) {
        graph.addEdge(node.id, edge.target);
      }
    } else {
      graph.addEdge(node.id, END);
    }
  }

  const startNodes = executableNodes.filter(
    (node) => String(node.data.nodeType || node.type) === "start",
  );
  const roots =
    startNodes.length > 0
      ? startNodes
      : executableNodes.filter((node) => (incomingCount.get(node.id) || 0) === 0);

  if (roots.length === 0) {
    throw new Error("Workflow must contain a Start node or a root node.");
  }

  for (const root of roots) {
    if (nodeIds.has(root.id)) graph.addEdge(START, root.id);
  }

  return graph.compile();
}

export async function invokeWorkflowGraph(options: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  input: unknown;
  state?: Partial<GraphState>;
  callbacks?: GraphCallbacks;
}) {
  const graph = buildWorkflowGraph(options);
  return graph.invoke(
    {
      input: options.input,
      lastOutput: options.state?.lastOutput ?? options.input,
      variables: options.state?.variables || {},
      nodeOutputs: options.state?.nodeOutputs || {},
      approvals: options.state?.approvals || {},
      iterations: options.state?.iterations || {},
      routes: options.state?.routes || {},
      completedNodeIds: options.state?.completedNodeIds || [],
    },
    { recursionLimit: 250 },
  );
}
