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
import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { getSystemPrompt } from "./prompts/system.ts";
import { getDesignSystemPropmpt } from "./prompts/design-system.ts";
import {
  getPreviewArtifactId,
  registerPreviewArtifact,
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
let activeArtifactPath = "";
let finalPath = "";

type InspectionRecord = {
  checkedAt: number;
  ok?: boolean;
  issues?: unknown[];
};

type VerificationArtifactState = {
  sandboxPath?: string;
  hostPath?: string;
  previewUrl?: string;
  lastModifiedAt?: number;
  previewCreatedAt?: number;
  staticInspection?: InspectionRecord;
  screenshotInspection?: InspectionRecord;
  snapshotInspection?: InspectionRecord;
  layoutInspection?: InspectionRecord;
};

const verificationState = new Map<string, VerificationArtifactState>();

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
    const state = verificationState.get(path);
    const missing: string[] = [];
    const issues: unknown[] = [];
    const staticInspection = await inspectStaticArtifact(path);
    const artifact = await registerPreviewArtifact(path, paths.workspaceDir);
    const fileStat = await stat(artifact.hostPath);
    const lastModifiedAt = fileStat.mtimeMs;
    const staleChecks: string[] = [];

    updateVerificationState(path, {
      sandboxPath: path,
      hostPath: artifact.hostPath,
      lastModifiedAt,
      staticInspection,
    });

    if (!staticInspection.ok) {
      issues.push(...staticInspection.issues);
    }

    if (!state?.previewUrl) {
      missing.push("create_preview");
    }
    if (!state?.screenshotInspection) {
      missing.push("take_screenshot");
    }
    if (!state?.snapshotInspection) {
      missing.push("take_snapshot");
    }
    if (!state?.layoutInspection) {
      missing.push("inspect_layout");
    }

    if (isInspectionStale(state?.screenshotInspection, lastModifiedAt)) {
      staleChecks.push("take_screenshot");
    }
    if (isInspectionStale(state?.snapshotInspection, lastModifiedAt)) {
      staleChecks.push("take_snapshot");
    }
    if (isInspectionStale(state?.layoutInspection, lastModifiedAt)) {
      staleChecks.push("inspect_layout");
    }

    if (staleChecks.length > 0) {
      issues.push({
        code: "stale_browser_inspection",
        checks: staleChecks,
        message:
          "The artifact was modified after browser inspection. Refresh the preview and inspect the latest version again.",
      });
    }

    if (missing.length > 0 || issues.length > 0) {
      return {
        ok: false,
        error: "verification_required",
        missing,
        issues,
      };
    }

    finalPath = path;

    return {
      ok: true,
      message: "The current work has been completed.",
    };
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

    const screenshotBytes = await readFile(screenshotFilePath);

    if (activeArtifactPath) {
      updateVerificationState(activeArtifactPath, {
        screenshotInspection: {
          checkedAt: Date.now(),
        },
      });
    }

    return [
      {
        type: "text",
        text: "Screenshot captured.",
      },
      {
        type: "image",
        image: {
          data: new Uint8Array(screenshotBytes),
          mediaType: "image/png",
        },
        detail: "high",
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

    if (activeArtifactPath) {
      updateVerificationState(activeArtifactPath, {
        snapshotInspection: {
          checkedAt: Date.now(),
        },
      });
    }

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
    const fileStat = await stat(artifact.hostPath);
    const staticInspection = await inspectStaticArtifact(path);
    const url = new URL(
      `/preview-artifacts/${artifact.id}`,
      previewBaseUrl,
    ).toString();

    activeArtifactPath = path;
    updateVerificationState(path, {
      sandboxPath: path,
      hostPath: artifact.hostPath,
      previewUrl: url,
      previewCreatedAt: Date.now(),
      lastModifiedAt: fileStat.mtimeMs,
      staticInspection,
    });

    return {
      ok: staticInspection.ok,
      previewUrl: url,
      staticInspection,
      message: `Preview created. Open this URL ${url} with new_page.`,
    };
  },
});

const inspectLayout = tool({
  name: "inspect_layout",
  description:
    "Inspect the current browser page and return structured DOM layout facts. It reports evidence only; it does not judge whether the design passes.",
  parameters: z.object({}),
  async execute() {
    if (!chromeDevtools) {
      return {
        error: "Chrome DevTools MCP is not available.",
      };
    }

    const result = await chromeDevtools.callTool("evaluate_script", {
      function: layoutInspectionScript.toString(),
    });

    if (activeArtifactPath) {
      updateVerificationState(activeArtifactPath, {
        layoutInspection: {
          checkedAt: Date.now(),
        },
      });
    }

    return result.map(({ text }) => ({
      type: "text",
      text,
    }));
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

function updateVerificationState(
  path: string,
  nextState: VerificationArtifactState,
) {
  verificationState.set(path, {
    ...verificationState.get(path),
    ...nextState,
  });
}

function isInspectionStale(
  inspection: InspectionRecord | undefined,
  lastModifiedAt: number,
) {
  return Boolean(inspection && inspection.checkedAt < lastModifiedAt);
}

async function inspectStaticArtifact(path: string) {
  const checkedAt = Date.now();
  const issues: Array<{ code: string; message: string }> = [];

  if (path !== "/workspace/output" && !path.startsWith("/workspace/output/")) {
    issues.push({
      code: "outside_output_directory",
      message: "Final JSX artifacts must be saved under /workspace/output.",
    });
  }

  if (!/\.(jsx|tsx)$/.test(path)) {
    issues.push({
      code: "invalid_artifact_extension",
      message: "The final artifact must be a .jsx or .tsx file.",
    });
  }

  let source = "";
  try {
    const artifact = await registerPreviewArtifact(path, paths.workspaceDir);
    source = await readFile(artifact.hostPath, "utf8");
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      issues: [
        ...issues,
        {
          code: "file_not_readable",
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }

  if (!/\bexport\s+default\s+function\s+App\s*\(/.test(source)) {
    issues.push({
      code: "missing_default_app_export",
      message: "The artifact must export default function App().",
    });
  }

  if (/\bdangerouslySetInnerHTML\b/.test(source)) {
    issues.push({
      code: "dangerously_set_inner_html",
      message: "dangerouslySetInnerHTML is not allowed.",
    });
  }

  if (
    /<(?:div|span|section|p|img|button|a|ul|ol|li|main|header|footer|nav|form|input|textarea)(?:\s|>|\/)/.test(
      source,
    )
  ) {
    issues.push({
      code: "raw_html_element",
      message:
        "Raw HTML elements are not allowed; use the documented UI library components.",
    });
  }

  if (!/<Root(?:\s|>)/.test(source)) {
    issues.push({
      code: "missing_root",
      message: "The artifact must use Root as the page root.",
    });
  }

  if (!/<Section(?:\s|>)/.test(source)) {
    issues.push({
      code: "missing_section",
      message: "The artifact must use Section to partition page content.",
    });
  }

  const importedComponentNames = new Set<string>();
  for (const match of source.matchAll(
    /import\s*\{([^}]+)\}\s*from\s*["']@\/components["']/g,
  )) {
    for (const part of match[1].split(",")) {
      const importedName = part
        .trim()
        .split(/\s+as\s+/)[0]
        ?.trim();

      if (importedName) {
        importedComponentNames.add(importedName);
      }
    }
  }

  for (const name of ["Root", "Section"]) {
    if (!importedComponentNames.has(name)) {
      issues.push({
        code: "missing_component_import",
        message: `Import ${name} from @/components.`,
      });
    }
  }

  const buildingComponents = [
    "Accordion",
    "Button",
    "Card",
    "Carousel",
    "Contact",
    "Divider",
    "Image",
    "Social",
    "Tabs",
    "Text",
  ];

  for (const componentName of buildingComponents) {
    if (
      new RegExp(`<${componentName}(?:\\s|>|/)`).test(source) &&
      !importedComponentNames.has(componentName)
    ) {
      issues.push({
        code: "missing_component_import",
        message: `Import ${componentName} from @/components.`,
      });
    }
  }

  if (
    /<Image(?:\s|>)/.test(source) &&
    !/\b(?:w-|h-|aspect-|width=|height=)/.test(source)
  ) {
    issues.push({
      code: "image_missing_explicit_size",
      message:
        "Image usage should include explicit width, height, or aspect-ratio sizing.",
    });
  }

  return {
    ok: issues.length === 0,
    checkedAt,
    issues,
  };
}

function layoutInspectionScript() {
  const win = globalThis as any;
  const doc = win.document;
  const scrolling = doc.scrollingElement || doc.documentElement;
  const report: {
    viewport: {
      width: number;
      height: number;
      devicePixelRatio: number;
    };
    document: {
      scrollWidth: number;
      scrollHeight: number;
      clientWidth: number;
      clientHeight: number;
      hasHorizontalOverflow: boolean;
      hasVerticalOverflow: boolean;
    };
    elements: unknown[];
    overlaps: unknown[];
    images: unknown[];
  } = {
    viewport: {
      width: win.innerWidth,
      height: win.innerHeight,
      devicePixelRatio: win.devicePixelRatio,
    },
    document: {
      scrollWidth: scrolling.scrollWidth,
      scrollHeight: scrolling.scrollHeight,
      clientWidth: scrolling.clientWidth,
      clientHeight: scrolling.clientHeight,
      hasHorizontalOverflow: scrolling.scrollWidth > scrolling.clientWidth + 1,
      hasVerticalOverflow: scrolling.scrollHeight > scrolling.clientHeight + 1,
    },
    elements: [],
    overlaps: [],
    images: [],
  };

  const nodes = Array.from(
    doc.querySelectorAll(
      "[data-slot], img, button, a, input, textarea, [role]",
    ),
  ) as any[];

  const records = nodes.map((el, index) => {
    const rect = el.getBoundingClientRect();
    const style = win.getComputedStyle(el);
    const text = (el.innerText || el.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
    const issues: string[] = [];

    if (rect.width === 0 || rect.height === 0) {
      issues.push("zero-size");
    }
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    ) {
      issues.push("invisible");
    }
    if (rect.left < -1 || rect.right > win.innerWidth + 1) {
      issues.push("outside-viewport-x");
    }
    if (rect.top < -1 || rect.bottom > win.innerHeight + 1) {
      issues.push("outside-viewport-y");
    }
    if (el.scrollWidth > el.clientWidth + 1) {
      issues.push("text-overflow-x");
    }
    if (el.scrollHeight > el.clientHeight + 1) {
      issues.push("text-overflow-y");
    }
    if (
      ["hidden", "clip", "auto"].includes(style.overflowX) &&
      el.scrollWidth > el.clientWidth + 1
    ) {
      issues.push("clipped-content-x");
    }
    if (
      ["hidden", "clip", "auto"].includes(style.overflowY) &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      issues.push("clipped-content-y");
    }
    if (
      ["BUTTON", "A"].includes(el.tagName) &&
      !text &&
      !el.getAttribute("aria-label")
    ) {
      issues.push("empty-action");
    }

    return {
      index,
      selector: el.getAttribute("data-slot")
        ? `[data-slot="${el.getAttribute("data-slot")}"]`
        : el.tagName.toLowerCase(),
      dataSlot: el.getAttribute("data-slot") || undefined,
      role: el.getAttribute("role"),
      text: text.slice(0, 80),
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
      },
      computed: {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        position: style.position,
        zIndex: style.zIndex,
      },
      issues,
    };
  });

  report.images = Array.from(doc.images).map((img: any) => {
    const rect = img.getBoundingClientRect();
    const issues: string[] = [];

    if (!img.alt) {
      issues.push("missing-alt");
    }
    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      issues.push("broken-image");
    }

    const naturalRatio =
      img.naturalWidth && img.naturalHeight
        ? img.naturalWidth / img.naturalHeight
        : null;
    const renderedRatio =
      rect.width && rect.height ? rect.width / rect.height : null;

    if (
      naturalRatio &&
      renderedRatio &&
      Math.abs(naturalRatio - renderedRatio) > 0.25
    ) {
      issues.push("distorted-aspect-ratio");
    }

    return {
      selector: img.getAttribute("data-slot")
        ? `[data-slot="${img.getAttribute("data-slot")}"]`
        : "img",
      src: img.currentSrc || img.src,
      alt: img.getAttribute("alt"),
      rendered: {
        width: rect.width,
        height: rect.height,
      },
      natural: {
        width: img.naturalWidth,
        height: img.naturalHeight,
      },
      issues,
    };
  });

  const visibleRecords = records.filter(
    (record) =>
      record.rect.width > 1 &&
      record.rect.height > 1 &&
      !record.issues.includes("invisible"),
  );
  const overlaps = [];

  for (let i = 0; i < visibleRecords.length; i++) {
    for (let j = i + 1; j < visibleRecords.length; j++) {
      const a = visibleRecords[i];
      const b = visibleRecords[j];

      if (
        nodes[a.index].contains(nodes[b.index]) ||
        nodes[b.index].contains(nodes[a.index])
      ) {
        continue;
      }

      const left = Math.max(a.rect.left, b.rect.left);
      const right = Math.min(a.rect.right, b.rect.right);
      const top = Math.max(a.rect.top, b.rect.top);
      const bottom = Math.min(a.rect.bottom, b.rect.bottom);
      const area = Math.max(0, right - left) * Math.max(0, bottom - top);

      if (area > 64) {
        overlaps.push({
          a: a.selector,
          b: b.selector,
          area,
        });
      }
    }
  }

  report.elements = records
    .filter((record) => record.dataSlot || record.issues.length > 0)
    .slice(0, 80);
  report.overlaps = overlaps.slice(0, 30);

  return report;
}

const proxyAgent = new ProxyAgent(proxyUrl);

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
  tools: [
    updateTodos,
    createPreview,
    takeScreenshot,
    takeSnapshot,
    inspectLayout,
    done,
  ],
  mcpServers: chromeDevtools ? [chromeDevtools] : [],
  instructions: getSystemPrompt(),
});

const sandboxSession = await new UnixLocalSandboxClient().create({ manifest });

const session = new MemorySession();

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
  return JSON.stringify(sanitizeForLog(value), null, 2);
}

function sanitizeForLog(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string") {
    if (value.startsWith("data:image/")) {
      return `[redacted image data URL, ${value.length} chars]`;
    }

    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value instanceof Uint8Array) {
    return `[redacted binary, ${value.byteLength} bytes]`;
  }

  if (value instanceof ArrayBuffer) {
    return `[redacted binary, ${value.byteLength} bytes]`;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, seen));
  }

  if (typeof value === "object" && value !== null) {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    if (
      "type" in value &&
      "data" in value &&
      (value as { type?: unknown }).type === "Buffer" &&
      Array.isArray((value as { data?: unknown }).data)
    ) {
      return `[redacted buffer, ${(value as { data: unknown[] }).data.length} bytes]`;
    }

    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = sanitizeForLog(nestedValue, seen);
    }

    return result;
  }

  return value;
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
