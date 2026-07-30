import "server-only";

import { generateText, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import Firecrawl from "@mendable/firecrawl-js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Sandbox } from "@e2b/code-interpreter";
import ky from "ky";
import { WorkflowHttpError } from "./errors";

export type ProviderName = "openai" | "anthropic" | "groq";

function requireEnvironmentKey(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new WorkflowHttpError(503, `${name} is not configured.`);
  }
  return value;
}

function resolveLanguageModel(provider: ProviderName, model?: string): LanguageModel {
  if (provider === "anthropic") {
    const anthropic = createAnthropic({
      apiKey: requireEnvironmentKey("ANTHROPIC_API_KEY"),
    });
    return anthropic(model || "claude-haiku-4-5");
  }

  if (provider === "groq") {
    const groq = createGroq({
      apiKey: requireEnvironmentKey("GROQ_API_KEY"),
    });
    return groq(model || "llama-3.3-70b-versatile");
  }

  const openai = createOpenAI({
    apiKey: requireEnvironmentKey("OPENAI_API_KEY"),
  });
  return openai(model || process.env.OPENAI_MODEL || "gpt-5-mini");
}

export async function runLanguageModel(options: {
  provider?: ProviderName;
  model?: string;
  system?: string;
  prompt: string;
}) {
  const result = await generateText({
    model: resolveLanguageModel(options.provider || "openai", options.model),
    system: options.system,
    prompt: options.prompt,
    maxOutputTokens: 4_096,
    abortSignal: AbortSignal.timeout(90_000),
  });

  return {
    text: result.text,
    usage: result.usage,
    finishReason: result.finishReason,
  };
}

export function createFirecrawlClient() {
  return new Firecrawl({
    apiKey: requireEnvironmentKey("FIRECRAWL_API_KEY"),
  });
}

export async function callMcpTool(options: {
  url: string;
  toolName: string;
  arguments?: Record<string, unknown>;
  authorization?: string;
}) {
  const url = new URL(options.url);
  if (!["https:", "http:"].includes(url.protocol)) {
    throw new WorkflowHttpError(400, "MCP URL must use HTTP or HTTPS.");
  }

  const client = new Client(
    { name: "bxr-open-agent-builder", version: "1.0.0" },
    { capabilities: {} },
  );
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: options.authorization
      ? { headers: { Authorization: `Bearer ${options.authorization}` } }
      : undefined,
  });

  try {
    await client.connect(transport);
    return await client.callTool({
      name: options.toolName,
      arguments: options.arguments || {},
    });
  } finally {
    await client.close();
  }
}

export async function runSandboxedTransform(options: {
  code: string;
  input: unknown;
  language?: "js" | "ts" | "python";
}) {
  const apiKey = requireEnvironmentKey("E2B_API_KEY");
  const sandbox = await Sandbox.create({ apiKey, timeoutMs: 120_000 });

  try {
    const language = options.language || "js";
    const serializedInput = JSON.stringify(options.input);
    const code =
      language === "python"
        ? `import json\ninput = json.loads(${JSON.stringify(serializedInput)})\n${options.code}`
        : `const input = ${serializedInput};\n${options.code}`;
    const execution = await sandbox.runCode(code, {
      language,
      requestTimeoutMs: 60_000,
    });

    if (execution.error) {
      throw new Error(`${execution.error.name}: ${execution.error.value}`);
    }

    const text =
      execution.text ||
      execution.logs.stdout.at(-1) ||
      execution.results.at(-1)?.text ||
      "";

    try {
      return JSON.parse(text);
    } catch {
      return { text, logs: execution.logs };
    }
  } finally {
    await sandbox.kill();
  }
}

export async function runHttpRequest(options: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}) {
  const url = new URL(options.url);
  if (!["https:", "http:"].includes(url.protocol)) {
    throw new WorkflowHttpError(400, "HTTP nodes require an HTTP or HTTPS URL.");
  }

  const response = await ky(url, {
    method: options.method || "GET",
    headers: options.headers,
    json:
      options.body === undefined ||
      ["GET", "HEAD"].includes((options.method || "GET").toUpperCase())
        ? undefined
        : options.body,
    timeout: 30_000,
    retry: { limit: 2, methods: ["get", "head", "put", "delete", "options", "trace"] },
    throwHttpErrors: false,
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  return {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  };
}
