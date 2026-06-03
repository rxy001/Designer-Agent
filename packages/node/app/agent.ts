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
import { appendFile, mkdir, readFile } from "node:fs/promises";
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
const logsDir = join(appDir, "../logs");
const runnerLogFile = join(logsDir, "runner.log");
const runnerLogReady = mkdir(logsDir, { recursive: true });
let runnerLogWriteQueue: Promise<void> = Promise.resolve();
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
  // errorFunction(_context, error) {
  //   const message = error instanceof Error ? error.message : String(error);
  //   return `Artifact validation failed. Fix the generated file and call done again. ${message}`;
  // },
  async execute({ path }) {
    monitorLog("tool.execute", {
      tool: "done",
      arguments: { path },
    });
    // await validateGeneratedArtifact(path);
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
  // toolUseBehavior(_context, toolResults) {
  //   const doneSucceeded =
  //     Boolean(finalPath) &&
  //     toolResults.some(
  //       (result) => result.type === "function_output" && result.tool === done,
  //     );

  //   if (!doneSucceeded) {
  //     return {
  //       isFinalOutput: false,
  //       isInterrupted: undefined,
  //     };
  //   }

  //   return {
  //     isFinalOutput: true,
  //     isInterrupted: undefined,
  //     finalOutput: `Done: ${finalPath}`,
  //   };
  // },
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
        maxTurns: 20,
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

async function validateGeneratedArtifact(filePath: string) {
  const localPath = toWorkspaceLocalPath(filePath);
  const source = await readFile(localPath, "utf8");
  const violations = findRawHtmlViolations(source);

  if (violations.length === 0) {
    return;
  }

  throw new Error(
    [
      "Generated artifact uses raw HTML elements or raw HTML escape hatches.",
      "Rewrite the UI with only the provided React components before calling done.",
      `Violations: ${violations.slice(0, 12).join(", ")}`,
    ].join(" "),
  );
}

function toWorkspaceLocalPath(filePath: string) {
  return resolve(workspaceDir, toWorkspaceRelativePath(filePath));
}

function findRawHtmlViolations(source: string) {
  const violations = new Set<string>();

  if (/\bdangerouslySetInnerHTML\b/.test(source)) {
    violations.add("dangerouslySetInnerHTML");
  }

  for (const scriptBody of getBabelScriptBodies(source)) {
    for (const tag of findDisallowedJsxTags(scriptBody)) {
      violations.add(`<${tag}>`);
    }
  }

  for (const tag of findDisallowedBodyTags(source)) {
    violations.add(`<${tag}>`);
  }

  return [...violations];
}

function getBabelScriptBodies(source: string) {
  const bodies: string[] = [];
  const scriptPattern =
    /<script\b(?=[^>]*\btype=(["'])text\/babel\1)[^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of source.matchAll(scriptPattern)) {
    bodies.push(match[2] ?? "");
  }

  return bodies;
}

function findDisallowedJsxTags(source: string) {
  const disallowedTags = new Set([
    "a",
    "article",
    "aside",
    "button",
    "div",
    "fieldset",
    "footer",
    "form",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "img",
    "input",
    "label",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "section",
    "select",
    "span",
    "textarea",
    "ul",
  ]);
  const found = new Set<string>();
  const tagPattern = /<\/?\s*([a-z][a-z0-9-]*)\b/gi;

  for (const match of source.matchAll(tagPattern)) {
    const tag = match[1]?.toLowerCase();

    if (tag && disallowedTags.has(tag)) {
      found.add(tag);
    }
  }

  return found;
}

function findDisallowedBodyTags(source: string) {
  const found = new Set<string>();
  const body = source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? source;
  const bodyWithoutScripts = body.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const bodyWithoutMountNode = bodyWithoutScripts.replace(
    /<\s*div\b(?=[^>]*\bid=(["'])(root|app)\1)[^>]*>\s*<\/\s*div\s*>/gi,
    "",
  );
  const tagPattern = /<\/?\s*(div|span)\b([^>]*)>/gi;

  for (const match of bodyWithoutMountNode.matchAll(tagPattern)) {
    const tag = match[1]?.toLowerCase();

    if (tag) {
      found.add(tag);
    }
  }

  return found;
}
