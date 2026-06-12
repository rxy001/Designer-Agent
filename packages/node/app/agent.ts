import {
  Manifest,
  SandboxAgent,
  Capabilities,
  localBindMountStrategy,
  mount,
  skills,
} from "@openai/agents/sandbox";
import {
  MCPServerStdio,
  tool,
  Runner,
  setDefaultOpenAIClient,
  MemorySession,
} from "@openai/agents";
import {
  localDirLazySkillSource,
  UnixLocalSandboxClient,
} from "@openai/agents/sandbox/local";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { appendFile, mkdir } from "node:fs/promises";
import { join, sep } from "node:path";
import { getSystemPrompt } from "./prompts/system.ts";
import { getDesignSystemPropmpt } from "./prompts/design-system.ts";
import {
  getPreviewArtifactId,
  registerPreviewArtifact,
  toWorkspaceRelativePath,
} from "./previewRegistry.ts";
import { z } from "zod";
import { OpenAI } from "openai";
import { fetch, ProxyAgent, install, setGlobalDispatcher } from "undici";
import { paths } from "./paths.ts";

install();

const key = process.env.OPEN_AI_KEY;
const proxyUrl = "http://127.0.0.1:7897";

const runnerLogFile = join(paths.logsDir, "runner.log");
const runnerLogReady = mkdir(paths.logsDir, { recursive: true });

let runnerLogWriteQueue: Promise<void> = Promise.resolve();
let todoList = [];

const manifest = new Manifest({
  root: "/workspace",
  entries: {
    output: mount({
      source: paths.workspaceDir,
      readOnly: false,
      mountStrategy: localBindMountStrategy(),
      description: "Writable local workspace directory.",
    }),
    components: mount({
      source: paths.componentsDir,
      readOnly: false,
      mountStrategy: localBindMountStrategy(),
      description: "Shared UI component reference files.",
    }),
  },
  extraPathGrants: [
    {
      path: paths.skillDir,
      readOnly: true,
      description: "Shared skill bundle.",
    },
  ],
});

const done = tool({
  name: "done",
  description: "When the work is finished",
  parameters: z.object({ path: z.string() }),
  async execute({ path }) {
    finalPath = path;

    return "The current work has been completed.";
  },
});

const takeScreenshot = tool({
  name: "take_screenshot",
  description:
    "Capture a screenshot of the current browser page. Returns the Chrome DevTools MCP text response plus a structured image output visible to the model.",
  parameters: z.object({}),
  async execute() {
    if (!chromeDevtools) {
      return {
        error: "Chrome DevTools MCP is not available.",
      };
    }
    const format = "png";
    const screenshotFilePath = join(
      paths.workspaceDir,
      `screenshot-${new Date().getTime()}.png`,
    );

    await chromeDevtools.callTool("take_screenshot", {
      format,
      fullPage: true,
      filePath: screenshotFilePath,
    });

    const fileId = await createFile(screenshotFilePath);

    return [
      {
        type: "text",
        text: "Screenshot captured.",
      },
      {
        type: "image",
        image: {
          fileId,
        },
      },
    ];
  },
});

const takeSnapshot = tool({
  name: "take_snapshot",
  description:
    "Capture the current browser page accessibility/text snapshot. Matches the Chrome DevTools MCP tool response;",
  parameters: z.object({
    verbose: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Whether to include all possible information available in the full a11y tree. Default is false.",
      ),
  }),
  async execute(args) {
    if (!chromeDevtools) {
      return {
        error: "Chrome DevTools MCP is not available.",
      };
    }

    const result = await chromeDevtools.callTool("take_snapshot", {
      ...args,
    });

    return result.map(({ text }) => ({
      type: "text",
      text,
    }));
  },
});

const previewBaseUrl = "http://localhost:3333";

const createPreview = tool({
  name: "create_preview",
  description:
    "Create a browser preview artifact for a generated JSX file and return its preview URL.",
  parameters: z.object({
    path: z.string(),
  }),
  async execute({ path }) {
    const artifact = await registerPreviewArtifact(path, paths.workspaceDir);
    const url = new URL(
      `/preview-artifacts/${artifact.id}`,
      previewBaseUrl,
    ).toString();

    return `Preview created. Open this URL ${url} with new_page.`;
  },
});

const updateTodos = tool({
  name: "update_todos",
  description:
    "Track your task list. Use this tool whenever you have more than one discrete task to do, or whenever given a long-running or multi-step task. Call it early to lay out your plan, then call it again as you complete, add, or remove tasks. Each call sends the COMPLETE current state of the todo list and fully replaces the previous state.",
  parameters: z.object({
    todos: z
      .array(
        z.object({
          name: z.string().trim().min(1).describe("Task description"),
          status: z
            .enum(["pending", "in_progress", "completed"])
            .describe("Current task status"),
        }),
      )
      .describe("The full list of todos"),
  }),
  execute({ todos }) {
    const duplicateNames = findDuplicateNames(todos);
    if (duplicateNames.length > 0) {
      return {
        todos,
        ok: false,
        error: "duplicate_todo_names",
        duplicate_names: duplicateNames,
      };
    }

    todoList = todos.map((todo) => ({
      name: todo.name,
      status: todo.status,
    }));

    return {
      ok: true,
      todos: todoList,
    };
  },
});

function findDuplicateNames(todos: Array<{ name: string; status: string }>) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const todo of todos) {
    const normalized = todo.name.toLocaleLowerCase();

    if (seen.has(normalized)) {
      duplicates.add(todo.name);
    } else {
      seen.add(normalized);
    }
  }

  return [...duplicates];
}

const proxyAgent = new ProxyAgent(proxyUrl);

setGlobalDispatcher(proxyAgent);

const openAIClient = new OpenAI({
  apiKey: key,
  timeout: 15 * 1000 * 60,
  baseURL: process.env.OPENAI_BASE_URL,
  // @ts-ignore
  fetch,
  fetchOptions: {
    dispatcher: proxyAgent,
  },
});

async function createFile(filePath: string) {
  const result = await openAIClient.files.create({
    file: createReadStream(filePath),
    purpose: "vision",
  });
  return result.id;
}

setDefaultOpenAIClient(openAIClient);

const runner = new Runner();

const chromeDevtools = await createChromeDevtoolsServer();

const agent = new SandboxAgent({
  name: "Desinger",
  model: "gpt-5.5",
  defaultManifest: manifest,
  capabilities: [
    ...Capabilities.default(),
    skills({
      lazyFrom: localDirLazySkillSource({
        src: paths.skillDir,
      }),
    }),
  ],
  tools: [updateTodos, createPreview, takeScreenshot, takeSnapshot, done],
  mcpServers: chromeDevtools ? [chromeDevtools] : [],
  instructions: getSystemPrompt(),
});

const sandboxSession = await new UnixLocalSandboxClient().create({ manifest });

const session = new MemorySession();

let finalPath = "";

interface Option {
  prompt: string;
  designSystemId: number;
}

export async function run({ prompt, designSystemId }: Option) {
  monitorLog("run.start", { prompt });
  try {
    const result = await runner.run(
      agent,
      [
        {
          role: "system",
          content: await getDesignSystemPropmpt(designSystemId),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        session,
        sandbox: {
          session: sandboxSession,
        },
        maxTurns: 100,
        stream: true,
      },
    );

    let modelOutputBuffer = "";
    const flushModelOutput = (reason: string) => {
      if (!modelOutputBuffer) {
        return;
      }

      monitorLog("model.output", {
        reason,
        text: modelOutputBuffer,
      });
      modelOutputBuffer = "";
    };

    for await (const event of result) {
      if (
        event.type === "raw_model_stream_event" &&
        event.data.type === "output_text_delta"
      ) {
        modelOutputBuffer += event.data.delta;
      } else if (event.type === "run_item_stream_event") {
        if (event.name === "message_output_created") {
          flushModelOutput(event.name);
        } else if (
          !["message_output_created", "tool_called", "tool_output"].includes(
            event.name,
          )
        ) {
          flushModelOutput(event.name);
          monitorLog("run.item", {
            name: event.name,
            item: event.item,
          });
        }
      }
    }

    flushModelOutput("stream_completed");

    await result.completed;

    monitorLog("run.end", {
      lastResponseId: result.lastResponseId,
      finalOutput: result.finalOutput,
    });

    if (finalPath) {
      let p = finalPath;
      finalPath = "";
      return {
        path: `${previewBaseUrl}/preview-artifacts/${getPreviewArtifactId(p)}`,
        message: result.finalOutput,
      };
    }

    return {
      message: result.finalOutput,
    };
  } catch (error) {
    monitorLog("run.error", error);
    throw error;
  }
}

function monitorLog(event: string, payload: unknown) {
  const time = new Date().toLocaleString();
  const serializedPayload = safeStringify(payload);

  runnerLogWriteQueue = runnerLogWriteQueue
    .then(() => runnerLogReady)
    .then(() =>
      appendFile(
        runnerLogFile,
        `[agent-monitor] ${time} ${event}\n${serializedPayload}\n`,
        "utf8",
      ),
    )
    .catch((error) => {
      console.error("[agent-monitor] failed to write runner log");
      console.error(error);
    });
}

function safeStringify(value: unknown) {
  const seen = new WeakSet<object>();

  return JSON.stringify(
    value,
    (_key, nestedValue) => {
      if (typeof nestedValue === "bigint") {
        return nestedValue.toString();
      }

      if (nestedValue instanceof Error) {
        return {
          name: nestedValue.name,
          message: nestedValue.message,
          stack: nestedValue.stack,
        };
      }

      if (typeof nestedValue === "object" && nestedValue !== null) {
        if (seen.has(nestedValue)) {
          return "[Circular]";
        }

        seen.add(nestedValue);
      }

      return nestedValue;
    },
    2,
  );
}

async function createChromeDevtoolsServer() {
  if (process.env.CHROME_DEVTOOLS_MCP === "disabled") {
    return null;
  }

  const server = new MCPServerStdio({
    name: "chrome-devtools",
    command: process.env.CHROME_DEVTOOLS_MCP_COMMAND ?? "npx",
    args: process.env.CHROME_DEVTOOLS_MCP_ARGS?.split(" ") ?? [
      "-y",
      "chrome-devtools-mcp@latest",
    ],
    cacheToolsList: true,
    toolFilter: {
      blockedToolNames: ["take_screenshot", "take_snapshot"],
    },
    timeout: 60_000,
  });

  try {
    await server.connect();
    return server;
  } catch (error) {
    monitorLog("chrome-devtools.connect.error", error);
    await server.close().catch(() => {});
    return null;
  }
}

async function closeChromeDevtools() {
  await chromeDevtools?.close().catch(() => {});
}

runner.on("agent_start", (_context, agent, turnInput) => {
  monitorLog("agent.start", {
    agent: agent.name,
    turnInput,
  });
});

runner.on("agent_tool_start", (_context, agent, tool, details) => {
  monitorLog("tool.start", {
    agent: agent.name,
    tool: tool.name,
    toolCall: details.toolCall,
  });
});

runner.on("agent_tool_end", (_context, agent, tool, result, details) => {
  monitorLog("tool.end", {
    agent: agent.name,
    tool: tool.name,
    toolCall: details.toolCall,
    result,
  });
});

runner.on("agent_end", (_context, agent, output) => {
  monitorLog("agent.end", {
    agent: agent.name,
    outputLength: typeof output === "string" ? output.length : undefined,
  });
});

process.once("SIGINT", () => {
  void closeChromeDevtools().finally(() => process.exit(0));
});

process.once("SIGTERM", () => {
  void closeChromeDevtools().finally(() => process.exit(0));
});
