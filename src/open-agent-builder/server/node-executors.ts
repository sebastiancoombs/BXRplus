import "server-only";

import Mustache from "mustache";
import jsonLogic from "json-logic-js";
import { JSONPath } from "jsonpath-plus";
import set from "lodash-es/set.js";
import type { WorkflowNode } from "./schema";
import {
  callMcpTool,
  createFirecrawlClient,
  runHttpRequest,
  runLanguageModel,
  runSandboxedTransform,
  type ProviderName,
} from "./providers";
import { WorkflowHttpError } from "./errors";
import { workflowCredential } from "./credentials";

export type ExecutionState = {
  input: unknown;
  lastOutput: unknown;
  variables: Record<string, unknown>;
  nodeOutputs: Record<string, unknown>;
  approvals: Record<string, { approved: boolean; output?: unknown; note?: string }>;
  iterations: Record<string, number>;
};

export type NodeExecution = {
  output: unknown;
  state?: Partial<ExecutionState>;
  route?: string;
};

export class ApprovalRequiredError extends Error {
  nodeId: string;
  messageForUser: string;

  constructor(nodeId: string, messageForUser: string) {
    super(messageForUser);
    this.name = "ApprovalRequiredError";
    this.nodeId = nodeId;
    this.messageForUser = messageForUser;
  }
}

function nodeConfig(node: WorkflowNode): Record<string, unknown> {
  const data = node.data as Record<string, unknown>;
  const raw = data.config;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...data, ...(raw as Record<string, unknown>) };
  }

  if (typeof raw === "string" && raw.trim().startsWith("{")) {
    try {
      return { ...data, ...(JSON.parse(raw) as Record<string, unknown>) };
    } catch {
      // A plain string remains useful as agent instructions.
    }
  }

  return { ...data };
}

function render(value: unknown, state: ExecutionState) {
  if (typeof value !== "string") return value;
  return Mustache.render(value, {
    input: state.input,
    inputJson: JSON.stringify(state.input),
    lastOutput: state.lastOutput,
    lastOutputJson: JSON.stringify(state.lastOutput),
    variables: state.variables,
    ...state.variables,
  });
}

function jsonLogicResult(rule: unknown, state: ExecutionState) {
  if (!rule || typeof rule !== "object") {
    throw new WorkflowHttpError(
      400,
      "Logic nodes require a JSON Logic rule in their configuration.",
    );
  }

  return jsonLogic.apply(rule as jsonLogic.RulesLogic, {
    input: state.input,
    lastOutput: state.lastOutput,
    variables: state.variables,
    nodeOutputs: state.nodeOutputs,
  });
}

function selectedInput(config: Record<string, unknown>, state: ExecutionState) {
  const path = config.inputPath;
  if (typeof path !== "string" || !path.trim()) return state.lastOutput;
  return JSONPath({
    path,
    json: {
      input: state.input,
      lastOutput: state.lastOutput,
      variables: state.variables,
      nodeOutputs: state.nodeOutputs,
    },
    wrap: false,
  });
}

async function executeAgent(node: WorkflowNode, state: ExecutionState) {
  const config = nodeConfig(node);
  const provider = (config.provider || "openai") as ProviderName;
  const prompt =
    render(
      config.instructions ||
        config.systemPrompt ||
        config.description ||
        "Process the supplied input and return the result.",
      state,
    ) || "";
  const context = selectedInput(config, state);

  const result = await runLanguageModel({
    provider,
    model: typeof config.model === "string" ? config.model : undefined,
    system:
      typeof config.system === "string"
        ? String(render(config.system, state))
        : undefined,
    prompt: `${String(prompt)}\n\nInput:\n${JSON.stringify(context, null, 2)}`,
  });

  return {
    output: result,
    state: { lastOutput: result.text },
  };
}

async function executeFirecrawl(node: WorkflowNode, state: ExecutionState) {
  const config = nodeConfig(node);
  const client = createFirecrawlClient() as any;
  const operation = String(config.operation || config.extractTool || "scrape");

  if (operation === "search") {
    const query = String(render(config.query || config.searchQuery, state) || "");
    if (!query) throw new WorkflowHttpError(400, "Firecrawl search requires a query.");
    const output = await client.search(query, {
      limit: Number(config.limit || config.searchLimit || 5),
    });
    return { output, state: { lastOutput: output } };
  }

  if (operation === "extract") {
    const urls = config.urls || config.extractUrls;
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new WorkflowHttpError(400, "Firecrawl extract requires one or more URLs.");
    }
    const output = await client.extract(
      urls.map((url: unknown) => String(render(url, state))),
      config.options || {},
    );
    return { output, state: { lastOutput: output } };
  }

  const url = String(render(config.url || config.scrapeUrl, state) || "");
  if (!url) throw new WorkflowHttpError(400, "Firecrawl scrape requires a URL.");
  const output = await client.scrape(url, (config.options || {}) as object);
  return { output, state: { lastOutput: output } };
}

async function executeTransform(node: WorkflowNode, state: ExecutionState) {
  const config = nodeConfig(node);
  const code = config.code || config.transformScript;
  if (typeof code !== "string" || !code.trim()) {
    return { output: state.lastOutput };
  }

  const output = await runSandboxedTransform({
    code,
    input: selectedInput(config, state),
    language:
      config.language === "python" || config.language === "ts"
        ? config.language
        : "js",
  });

  return { output, state: { lastOutput: output } };
}

async function executeSetState(node: WorkflowNode, state: ExecutionState) {
  const config = nodeConfig(node);
  const key = String(config.key || config.stateKey || "").trim();
  if (!key) throw new WorkflowHttpError(400, "Set State requires a key.");

  const value =
    config.value !== undefined
      ? render(config.value, state)
      : config.stateValue !== undefined
        ? render(config.stateValue, state)
        : state.lastOutput;
  const variables = structuredClone(state.variables);
  set(variables, key, value);

  return {
    output: { key, value },
    state: { variables, lastOutput: value },
  };
}

async function executeHttp(node: WorkflowNode, state: ExecutionState) {
  const config = nodeConfig(node);
  const url = String(render(config.url, state) || "");
  if (!url) throw new WorkflowHttpError(400, "HTTP nodes require a URL.");

  const output = await runHttpRequest({
    url,
    method: typeof config.method === "string" ? config.method : "GET",
    headers:
      config.headers && typeof config.headers === "object"
        ? (config.headers as Record<string, string>)
        : undefined,
    body:
      config.body === undefined
        ? undefined
        : typeof config.body === "string"
          ? render(config.body, state)
          : config.body,
  });

  return { output, state: { lastOutput: output.body } };
}

async function executeMcp(node: WorkflowNode, state: ExecutionState) {
  const config = nodeConfig(node);
  const url = String(render(config.url || config.serverUrl, state) || "");
  const toolName = String(config.toolName || config.mcpAction || "");
  if (!url || !toolName) {
    throw new WorkflowHttpError(400, "MCP nodes require a server URL and tool name.");
  }

  const output = await callMcpTool({
    url,
    toolName,
    arguments:
      config.arguments && typeof config.arguments === "object"
        ? (config.arguments as Record<string, unknown>)
        : { input: state.lastOutput },
    authorization: workflowCredential("mcp") || process.env.MCP_AUTH_TOKEN,
  });

  return { output, state: { lastOutput: output } };
}

export async function executeWorkflowNode(
  node: WorkflowNode,
  state: ExecutionState,
): Promise<NodeExecution> {
  const nodeType = String(node.data.nodeType || node.type || "");
  const config = nodeConfig(node);

  switch (nodeType) {
    case "start":
      return { output: state.input, state: { lastOutput: state.input } };
    case "end":
      return { output: state.lastOutput };
    case "note":
      return { output: state.lastOutput };
    case "agent":
      return executeAgent(node, state);
    case "mcp":
      return executeMcp(node, state);
    case "extract":
    case "firecrawl":
      return executeFirecrawl(node, state);
    case "http":
      return executeHttp(node, state);
    case "transform":
      return executeTransform(node, state);
    case "set-state":
      return executeSetState(node, state);
    case "if-else": {
      const result = Boolean(jsonLogicResult(config.rule || config.condition, state));
      return {
        output: { result },
        route: result ? "true" : "false",
        state: { lastOutput: result },
      };
    }
    case "while": {
      const iteration = (state.iterations[node.id] || 0) + 1;
      const maxIterations = Math.min(Number(config.maxIterations || 25), 100);
      const shouldContinue =
        iteration <= maxIterations &&
        Boolean(jsonLogicResult(config.rule || config.condition, state));
      return {
        output: { continue: shouldContinue, iteration },
        route: shouldContinue ? "loop" : "done",
        state: {
          lastOutput: shouldContinue,
          iterations: { ...state.iterations, [node.id]: iteration },
        },
      };
    }
    case "user-approval": {
      const approval = state.approvals[node.id];
      if (!approval) {
        throw new ApprovalRequiredError(
          node.id,
          String(
            render(
              config.message ||
                config.approvalMessage ||
                "This workflow is waiting for approval.",
              state,
            ),
          ),
        );
      }
      if (!approval.approved) {
        throw new WorkflowHttpError(409, "The workflow approval was declined.");
      }
      const output = approval.output ?? state.lastOutput;
      return { output, state: { lastOutput: output } };
    }
    default:
      throw new WorkflowHttpError(400, `Unsupported node type: ${nodeType}`);
  }
}
