import {
  Manifest,
  SandboxAgent,
  Capabilities,
  localBindMountStrategy,
  mount,
  skills,
} from "@openai/agents/sandbox";
import {
  tool,
  Runner,
  setDefaultOpenAIClient,
  setTracingDisabled,
} from "@openai/agents";
import {
  localDirLazySkillSource,
  UnixLocalSandboxClient,
} from "@openai/agents/sandbox/local";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getSystemPrompt } from "./prompts/system.ts";
import { getDesignSystemPropmpt } from "./prompts/design-system.ts";
import { z } from "zod";
import { OpenAI } from "openai";
import { fetch, ProxyAgent, setGlobalDispatcher } from "undici";

const key = process.env.OPEN_AI_KEY;
const proxyUrl = "http://127.0.0.1:7897";

const appDir = dirname(fileURLToPath(import.meta.url));
const sharedSkillsDir = join(appDir, "../skills");
const componentsDir = join(appDir, "../components");
const workspaceDir = join(appDir, "../workspace");
const sandboxWorkspaceDir = "/workspace";
const sandboxOutputDir = `${sandboxWorkspaceDir}/output`;

const manifest = new Manifest({
  root: sandboxWorkspaceDir,
  entries: {
    output: mount({
      source: workspaceDir,
      readOnly: false,
      mountStrategy: localBindMountStrategy(),
      description: "Writable local workspace directory.",
    }),
    components: mount({
      source: componentsDir,
      readOnly: false,
      mountStrategy: localBindMountStrategy(),
      description: "Shared UI component reference files.",
    }),
  },
  extraPathGrants: [
    {
      path: sharedSkillsDir,
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
    monitorLog("tool.execute", {
      tool: "done",
      arguments: { path },
    });
    finalPath = path;
  },
});

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

setDefaultOpenAIClient(openAIClient);

const runner = new Runner();

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
  monitorLog("model.reply", {
    agent: agent.name,
    output,
  });
});

const agent = new SandboxAgent({
  name: "Desinger",
  defaultManifest: manifest,
  capabilities: [
    ...Capabilities.default(),
    skills({
      lazyFrom: localDirLazySkillSource({
        src: sharedSkillsDir,
      }),
    }),
  ],
  tools: [done],
  instructions: getSystemPrompt(),
});

setTracingDisabled(false);

const client = new UnixLocalSandboxClient();

const session = await client.create({ manifest });

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
        sandbox: {
          session,
        },
      },
    );

    monitorLog("run.end", {
      finalOutput: result.finalOutput,
      lastResponseId: result.lastResponseId,
      newItems: result.newItems,
    });

    if (finalPath) {
      let p = finalPath;
      finalPath = "";
      return {
        path: toWorkspaceFileRoute(p),
      };
    }

    return {
      message: result.finalOutput,
    };
  } catch (error) {
    monitorLog("run.error", error);
  }
}

function monitorLog(event: string, payload: unknown) {
  console.log(`[agent-monitor] ${new Date().toISOString()} ${event}`);
  console.log(safeStringify(payload));
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

function toWorkspaceFileRoute(filePath: string) {
  return toWorkspaceRoute(toWorkspaceRelativePath(filePath));
}

function toWorkspaceRelativePath(filePath: string) {
  if (
    filePath === sandboxOutputDir ||
    filePath.startsWith(`${sandboxOutputDir}/`)
  ) {
    return filePath.slice(sandboxOutputDir.length + 1);
  }

  if (
    filePath === sandboxWorkspaceDir ||
    filePath.startsWith(`${sandboxWorkspaceDir}/`)
  ) {
    return filePath.slice(sandboxWorkspaceDir.length + 1);
  }

  const absolutePath = isAbsolute(filePath)
    ? resolve(filePath)
    : resolve(workspaceDir, filePath);
  const relativePath = relative(workspaceDir, absolutePath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Path is outside workspace: ${filePath}`);
  }

  return relativePath;
}

function toWorkspaceRoute(relativePath: string) {
  return `/workspace/${relativePath
    .split(sep)
    .map(encodeURIComponent)
    .join("/")}`;
}
