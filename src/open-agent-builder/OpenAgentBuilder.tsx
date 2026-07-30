"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  CirclePlay,
  Copy,
  Download,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import AgentNode, { nodeVisuals } from "./AgentNode";
import type { BuilderNodeData, BuilderNodeType } from "./types";
import {
  createWorkflow,
  listWorkflows,
  runWorkflow as runPersistedWorkflow,
  streamWorkflowRun,
  updateWorkflow,
} from "./client-api";
import styles from "./open-agent-builder.module.css";

const storageKey = "bxr_open_agent_builder_session_notes";

const categories: Array<{
  label: string;
  nodes: BuilderNodeType[];
}> = [
  { label: "Core", nodes: ["agent", "end", "note"] },
  { label: "Tools", nodes: ["mcp"] },
  { label: "Logic", nodes: ["if-else", "while", "user-approval"] },
  { label: "Data", nodes: ["transform", "extract", "http", "set-state"] },
];

const initialNodes: Node<BuilderNodeData>[] = [
  {
    id: "node_start",
    type: "agentNode",
    position: { x: 160, y: 260 },
    data: {
      nodeType: "start",
      title: "Start",
      description: "Workflow input",
    },
  },
];

const nodeTypes = { agentNode: AgentNode };

function Canvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const backendHydrated = useRef(false);
  const creatingWorkflow = useRef(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BuilderNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState("Untitled workflow");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const workflowsQuery = useQuery({
    queryKey: ["agent-workflows"],
    queryFn: listWorkflows,
    retry: 1,
  });
  const createMutation = useMutation({
    mutationFn: createWorkflow,
    onSuccess: ({ workflow }) => {
      creatingWorkflow.current = false;
      setWorkflowId(workflow.id);
      backendHydrated.current = true;
      setSaved(true);
    },
    onError: () => {
      creatingWorkflow.current = false;
    },
  });
  const saveMutation = useMutation({
    mutationFn: ({
      id,
      name,
      savedNodes,
      savedEdges,
    }: {
      id: string;
      name: string;
      savedNodes: Node<BuilderNodeData>[];
      savedEdges: Edge[];
    }) =>
      updateWorkflow(id, {
        name,
        nodes: savedNodes,
        edges: savedEdges,
      }),
    onSuccess: () => setSaved(true),
  });
  const runMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: unknown }) =>
      runPersistedWorkflow(id, input),
  });

  useEffect(() => {
    const savedWorkflow = localStorage.getItem(storageKey);
    if (!savedWorkflow) return;

    try {
      const parsed = JSON.parse(savedWorkflow) as {
        name?: string;
        nodes?: Node<BuilderNodeData>[];
        edges?: Edge[];
      };
      if (parsed.name) setWorkflowName(parsed.name);
      if (Array.isArray(parsed.nodes) && parsed.nodes.length) {
        setNodes(parsed.nodes);
        nextId.current = parsed.nodes.length + 1;
      }
      if (Array.isArray(parsed.edges)) setEdges(parsed.edges);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [setEdges, setNodes]);

  useEffect(() => {
    if (backendHydrated.current || !workflowsQuery.data) return;
    const workflow = workflowsQuery.data.workflows[0];

    if (workflow) {
      setWorkflowId(workflow.id);
      setWorkflowName(workflow.name);
      if (Array.isArray(workflow.nodes) && workflow.nodes.length) {
        setNodes(workflow.nodes as Node<BuilderNodeData>[]);
        nextId.current = workflow.nodes.length + 1;
      }
      if (Array.isArray(workflow.edges)) {
        setEdges(workflow.edges as Edge[]);
      }
      backendHydrated.current = true;
      setSaved(true);
      return;
    }

    if (creatingWorkflow.current) return;
    creatingWorkflow.current = true;
    createMutation.mutate({
      name: workflowName,
      nodes,
      edges,
    });
  }, [
    createMutation,
    edges,
    nodes,
    setEdges,
    setNodes,
    workflowName,
    workflowsQuery.data,
  ]);

  const persistWorkflow = useDebouncedCallback(
    (
      id: string,
      name: string,
      savedNodes: Node<BuilderNodeData>[],
      savedEdges: Edge[],
    ) => {
      saveMutation.mutate({ id, name, savedNodes, savedEdges });
    },
    600,
  );

  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ name: workflowName, nodes, edges }),
    );
    if (workflowId && backendHydrated.current) {
      persistWorkflow(workflowId, workflowName, nodes, edges);
    }
  }, [edges, nodes, persistWorkflow, workflowId, workflowName]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: false,
            style: { stroke: "#a1a1aa", strokeWidth: 1.5 },
          },
          current,
        ),
      );
      setSaved(false);
    },
    [setEdges],
  );

  const addNode = useCallback(
    (nodeType: BuilderNodeType, position?: { x: number; y: number }) => {
      const visual = nodeVisuals[nodeType];
      const id = `node_${Date.now()}_${nextId.current++}`;
      const newNode: Node<BuilderNodeData> = {
        id,
        type: "agentNode",
        position:
          position ?? {
            x: 360 + (nextId.current % 4) * 40,
            y: 180 + (nextId.current % 5) * 90,
          },
        data: {
          nodeType,
          title: visual.label,
          description:
            nodeType === "agent"
              ? "Configure instructions"
              : nodeType === "mcp"
                ? "Connect an MCP server"
                : "",
        },
      };

      setNodes((current) => [...current, newNode]);
      setSelectedNodeId(id);
      setSaved(false);
    },
    [setNodes],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData(
        "application/open-agent-builder",
      ) as BuilderNodeType;
      if (!nodeType || !wrapperRef.current) return;

      addNode(
        nodeType,
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      );
    },
    [addNode, screenToFlowPosition],
  );

  const updateSelectedNode = (patch: Partial<BuilderNodeData>) => {
    if (!selectedNodeId) return;
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId
          ? { ...node, data: { ...node.data, ...patch } }
          : node,
      ),
    );
    setSaved(false);
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId || selectedNode?.data.nodeType === "start") return;
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
    setEdges((current) =>
      current.filter(
        (edge) =>
          edge.source !== selectedNodeId && edge.target !== selectedNodeId,
      ),
    );
    setSelectedNodeId(null);
    setSaved(false);
  };

  const duplicateSelectedNode = () => {
    if (!selectedNode) return;
    const id = `node_${Date.now()}_${nextId.current++}`;
    setNodes((current) => [
      ...current,
      {
        ...selectedNode,
        id,
        selected: false,
        position: {
          x: selectedNode.position.x + 45,
          y: selectedNode.position.y + 45,
        },
      },
    ]);
    setSelectedNodeId(id);
    setSaved(false);
  };

  const runWorkflow = async () => {
    if (nodes.length < 2) {
      setRunMessage("Add and connect at least one node before running.");
      return;
    }
    if (!workflowId) {
      setRunMessage("The workflow must finish saving before it can run.");
      return;
    }

    setRunning(true);
    setRunMessage("Running workflow…");
    try {
      persistWorkflow.cancel();
      await updateWorkflow(workflowId, {
        name: workflowName,
        nodes,
        edges,
      });
      setSaved(true);
      const { run } = await runMutation.mutateAsync({
        id: workflowId,
        input: {},
      });
      const completedRun = await streamWorkflowRun(run.id, (progress) => {
        const activeNode = progress.agent_workflow_node_runs?.find(
          (nodeRun) => nodeRun.status === "running",
        );
        setRunMessage(
          progress.status === "waiting_approval"
            ? "Workflow is waiting for approval."
            : activeNode
              ? `Running ${activeNode.node_id}…`
              : `Workflow ${progress.status}…`,
        );
      });
      setRunMessage(
        completedRun.status === "completed"
          ? "Workflow completed."
          : completedRun.status === "waiting_approval"
            ? "Workflow is waiting for approval."
            : completedRun.error || `Workflow ${completedRun.status}.`,
      );
    } catch (error) {
      setRunMessage(
        error instanceof Error ? error.message : "Workflow execution failed.",
      );
    } finally {
      setRunning(false);
    }
  };

  const exportWorkflow = () => {
    const content = JSON.stringify({ name: workflowName, nodes, edges }, null, 2);
    const href = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = href;
    link.download = `${workflowName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "workflow"}.json`;
    link.click();
    URL.revokeObjectURL(href);
  };

  const resetWorkflow = () => {
    setNodes(initialNodes);
    setEdges([]);
    setSelectedNodeId(null);
    setWorkflowName("Untitled workflow");
    setRunMessage(null);
    setSaved(false);
    window.setTimeout(() => fitView({ padding: 0.25 }), 0);
  };

  const minimapColor = useCallback(
    (node: Node) =>
      nodeVisuals[(node.data as BuilderNodeData).nodeType]?.color ?? "#a1a1aa",
    [],
  );

  return (
    <section className={styles.builder} aria-label="Open Agent Builder">
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button className={styles.iconButton} aria-label="Back">
            <ChevronLeft size={18} />
          </button>
          <div className={styles.brandMark}>火</div>
          <span className={styles.divider} />
          <input
            className={styles.workflowName}
            value={workflowName}
            onChange={(event) => {
              setWorkflowName(event.target.value);
              setSaved(false);
            }}
            aria-label="Workflow name"
          />
          <span className={styles.savedState}>
            {saved && !saveMutation.isPending ? <Check size={13} /> : <Save size={13} />}
            {saveMutation.isError
              ? "Local only"
              : saved && !saveMutation.isPending
                ? "Saved"
                : "Saving"}
          </span>
        </div>

        <div className={styles.toolbarActions}>
          <button className={styles.secondaryButton} onClick={exportWorkflow}>
            <Download size={15} />
            Export
          </button>
          <button className={styles.secondaryButton}>
            <Settings2 size={15} />
            Settings
          </button>
          <button className={styles.runButton} onClick={runWorkflow} disabled={running}>
            <CirclePlay size={16} />
            {running ? "Running" : "Run"}
            <ChevronDown size={14} />
          </button>
          <button className={styles.iconButton} aria-label="More options">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.palette}>
          <div className={styles.paletteHeading}>
            <span>Nodes</span>
            <button aria-label="Add node">
              <Plus size={15} />
            </button>
          </div>
          <div className={styles.paletteScroll}>
            {categories.map((category) => (
              <div className={styles.category} key={category.label}>
                <p>{category.label}</p>
                {category.nodes.map((nodeType) => {
                  const visual = nodeVisuals[nodeType];
                  const Icon = visual.icon;
                  return (
                    <button
                      key={nodeType}
                      className={styles.paletteNode}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          "application/open-agent-builder",
                          nodeType,
                        );
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => addNode(nodeType)}
                    >
                      <span style={{ backgroundColor: visual.color }}>
                        <Icon size={14} strokeWidth={2.2} />
                      </span>
                      {visual.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <button className={styles.resetButton} onClick={resetWorkflow}>
            <RotateCcw size={14} />
            Reset canvas
          </button>
        </aside>

        <div
          ref={wrapperRef}
          className={styles.flowCanvas}
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              setSaved(false);
            }}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              setSaved(false);
            }}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            fitViewOptions={{ padding: 0.35 }}
            minZoom={0.25}
            maxZoom={2}
            deleteKeyCode={null}
            proOptions={{ hideAttribution: false }}
          >
            <Background
              color="#d4d4d8"
              gap={20}
              size={1}
              variant={BackgroundVariant.Dots}
            />
            <Controls position="bottom-right" showInteractive={false} />
            <MiniMap
              position="bottom-left"
              nodeColor={minimapColor}
              maskColor="rgb(250 250 250 / 72%)"
              pannable
              zoomable
            />
          </ReactFlow>

          {runMessage && (
            <div className={styles.runToast}>
              <Play size={14} />
              <span>{runMessage}</span>
              <button onClick={() => setRunMessage(null)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {selectedNode && (
          <aside className={styles.inspector}>
            <div className={styles.inspectorHeader}>
              <div>
                <span
                  style={{
                    backgroundColor:
                      nodeVisuals[selectedNode.data.nodeType].color,
                  }}
                />
                <strong>{nodeVisuals[selectedNode.data.nodeType].label}</strong>
              </div>
              <button onClick={() => setSelectedNodeId(null)} aria-label="Close panel">
                <X size={17} />
              </button>
            </div>

            <div className={styles.inspectorBody}>
              <label>
                Name
                <input
                  value={selectedNode.data.title}
                  onChange={(event) =>
                    updateSelectedNode({ title: event.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  rows={3}
                  value={selectedNode.data.description}
                  onChange={(event) =>
                    updateSelectedNode({ description: event.target.value })
                  }
                  placeholder="Describe what this node should do"
                />
              </label>
              {selectedNode.data.nodeType === "agent" && (
                <label>
                  Configuration
                  <textarea
                    rows={8}
                    value={
                      typeof selectedNode.data.config === "string"
                        ? selectedNode.data.config
                        : JSON.stringify(selectedNode.data.config || {}, null, 2)
                    }
                    onChange={(event) =>
                      updateSelectedNode({ config: event.target.value })
                    }
                    placeholder={'{"provider":"openai","model":"gpt-5-mini","instructions":"Process {{lastOutputJson}}"}'}
                  />
                </label>
              )}
              {selectedNode.data.nodeType === "mcp" && (
                <label>
                  Configuration
                  <textarea
                    rows={8}
                    value={
                      typeof selectedNode.data.config === "string"
                        ? selectedNode.data.config
                        : JSON.stringify(selectedNode.data.config || {}, null, 2)
                    }
                    onChange={(event) =>
                      updateSelectedNode({ config: event.target.value })
                    }
                    placeholder={'{"url":"https://example.com/mcp","toolName":"tool_name","arguments":{}}'}
                  />
                </label>
              )}
              {!["start", "end", "note", "agent", "mcp"].includes(
                selectedNode.data.nodeType,
              ) && (
                <label>
                  Configuration
                  <textarea
                    rows={9}
                    value={
                      typeof selectedNode.data.config === "string"
                        ? selectedNode.data.config
                        : JSON.stringify(selectedNode.data.config || {}, null, 2)
                    }
                    onChange={(event) =>
                      updateSelectedNode({ config: event.target.value })
                    }
                    placeholder="{}"
                  />
                </label>
              )}
            </div>

            <div className={styles.inspectorFooter}>
              <button onClick={duplicateSelectedNode}>
                <Copy size={14} />
                Duplicate
              </button>
              {selectedNode.data.nodeType !== "start" && (
                <button className={styles.deleteButton} onClick={deleteSelectedNode}>
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

export default function OpenAgentBuilder() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>
    </QueryClientProvider>
  );
}
