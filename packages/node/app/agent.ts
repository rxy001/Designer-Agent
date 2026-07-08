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
import { getUserPrompt } from "./prompts/user.ts";
import {
  getPreviewArtifactId,
  registerPreviewArtifact,
  toWorkspaceRelativePath,
} from "./previewRegistry.ts";
import { diffPageDocuments } from "./editor/diffPageDocuments.ts";
import { filterPatchByTargetTool } from "./editor/filterPatchByTargetTool.ts";
import { jsxToPageDocument } from "./editor/jsxToPageDocument.ts";
import { pageDocumentToJsx } from "./editor/pageDocumentToJsx.ts";
import { pageDocumentSchema, pagePatchSchema } from "./editor/schema.ts";
import type { PagePatch } from "./editor/schema.ts";
import { z } from "zod";
import { OpenAI } from "openai";
import type { ResponseUsage } from "openai/resources/responses/responses";
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

const buildingComponents = [
  "Accordion",
  "Button",
  "Card",
  "Carousel",
  "Contact",
  "Divider",
  "Image",
  "Navbar",
  "Social",
  "Tabs",
  "Text",
] as const;

const buildingComponentSet = new Set<string>(buildingComponents);
const stubGuardSnapshots = new Map<string, ArtifactSnapshot>();

type ArtifactSnapshot = {
  sizeBytes: number;
  lineCount: number;
};

type TokenUsageTotals = Pick<
  ResponseUsage,
  "input_tokens" | "output_tokens" | "total_tokens"
> & {
  cached_tokens: number;
  reasoning_tokens: number;
};

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
    const layoutInspection = state?.layoutInspection;

    if (!layoutInspection) {
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

    if (
      layoutInspection &&
      !staleChecks.includes("inspect_layout") &&
      layoutInspection.ok === false
    ) {
      issues.push(...(layoutInspection.issues ?? []));
    }

    if (staticInspection.snapshot) {
      const stubGuardIssue = evaluateArtifactStubGuard(
        path,
        staticInspection.snapshot,
      );
      if (stubGuardIssue) {
        issues.push(stubGuardIssue);
      }
    }

    if (missing.length > 0 || issues.length > 0) {
      const verificationReport = buildVerificationReport({
        missing,
        issues,
        staleChecks,
        staticInspectionOk: staticInspection.ok,
        state,
      });

      return {
        ok: false,
        error: "verification_required",
        message:
          "The artifact is not ready to finish. Complete the verification report actions, revise if needed, then call done again.",
        missing,
        issues,
        verificationReport,
      };
    }

    finalPath = path;
    if (staticInspection.snapshot) {
      stubGuardSnapshots.set(path, staticInspection.snapshot);
    }

    return {
      ok: true,
      message: "The current work has been completed.",
    };
  },
});

function buildVerificationReport({
  missing,
  issues,
  staleChecks,
  staticInspectionOk,
  state,
}: {
  missing: string[];
  issues: unknown[];
  staleChecks: string[];
  staticInspectionOk: boolean;
  state: VerificationArtifactState | undefined;
}) {
  const nextActions: string[] = [];

  if (missing.includes("create_preview")) {
    nextActions.push("Call create_preview for the JSX artifact path.");
  }
  if (missing.includes("inspect_layout")) {
    nextActions.push(
      "Open or refresh the preview URL, then call inspect_layout first and interpret the returned layout facts for overflow, clipping, overlap, and zero-size elements.",
    );
  }
  if (missing.includes("take_snapshot")) {
    nextActions.push(
      "After layout issues are cleared, call take_snapshot and inspect visible text, reading order, labels, and accessibility tree coverage.",
    );
  }
  if (missing.includes("take_screenshot")) {
    nextActions.push(
      "Call take_screenshot last as the final visual composition check.",
    );
  }
  if (staleChecks.length > 0) {
    nextActions.push(
      `The artifact changed after ${staleChecks.join(
        ", ",
      )}; refresh the existing preview URL and repeat those checks.`,
    );
  }
  if (!staticInspectionOk) {
    nextActions.push(
      "Fix the static inspection issues in the JSX artifact before re-running browser inspection.",
    );
  }

  return {
    status: "blocked",
    reason:
      "done requires a valid artifact, an existing preview, and fresh layout, snapshot, and screenshot evidence.",
    checks: {
      staticInspection: staticInspectionOk ? "passed" : "failed",
      createPreview: state?.previewUrl ? "completed" : "missing",
      screenshotInspection: getInspectionStatus(
        state?.screenshotInspection,
        staleChecks.includes("take_screenshot"),
      ),
      snapshotInspection: getInspectionStatus(
        state?.snapshotInspection,
        staleChecks.includes("take_snapshot"),
      ),
      layoutInspection: getInspectionStatus(
        state?.layoutInspection,
        staleChecks.includes("inspect_layout"),
      ),
    },
    missing,
    staleChecks,
    issues,
    nextActions,
  };
}

function getInspectionStatus(
  inspection: InspectionRecord | undefined,
  isStale: boolean,
) {
  if (!inspection) {
    return "missing";
  }

  return isStale ? "stale" : "completed";
}

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
    "Inspect the current browser page and return blocking layout issues only. Pass debug=true only when full DOM layout facts are needed.",
  parameters: z.object({
    debug: z.boolean().optional().default(false),
  }),
  async execute({ debug }) {
    if (!chromeDevtools) {
      return {
        error: "Chrome DevTools MCP is not available.",
      };
    }

    const result = await chromeDevtools.callTool("evaluate_script", {
      function: layoutInspectionScript.toString(),
    });
    const layoutIssues = collectLayoutHardFailures(result);
    const summary = buildLayoutInspectionSummary(layoutIssues);

    if (activeArtifactPath) {
      updateVerificationState(activeArtifactPath, {
        layoutInspection: {
          checkedAt: Date.now(),
          ok: layoutIssues.length === 0,
          issues: layoutIssues,
        },
      });
    }

    if (debug) {
      return [
        ...result.map(({ text }) => ({
          type: "text",
          text,
        })),
        {
          type: "text",
          text: JSON.stringify(summary, null, 2),
        },
      ];
    }

    return [
      {
        type: "text",
        text: JSON.stringify(summary, null, 2),
      },
    ];
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

  const snapshot = buildArtifactSnapshot(source);

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

  for (const match of source.matchAll(/<Section\b([^>]*)>/g)) {
    if (!/\bheight\s*=/.test(match[1] ?? "")) {
      issues.push({
        code: "section_missing_explicit_height",
        message: "Every Section must include an explicit height prop.",
      });
      break;
    }
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

  issues.push(...inspectComponentStructure(source));
  const warnings = inspectGridPlacementWarnings(source);
  issues.push(...inspectAntiSlopPatterns(source));

  return {
    ok: issues.length === 0,
    checkedAt,
    issues,
    warnings,
    snapshot,
  };
}

function buildArtifactSnapshot(source: string): ArtifactSnapshot {
  return {
    sizeBytes: Buffer.byteLength(source, "utf8"),
    lineCount: source.split(/\r?\n/).length,
  };
}

function evaluateArtifactStubGuard(path: string, snapshot: ArtifactSnapshot) {
  const prior = stubGuardSnapshots.get(path);

  if (!prior || prior.sizeBytes < 4096) {
    return null;
  }

  if (snapshot.sizeBytes >= prior.sizeBytes * 0.2) {
    return null;
  }

  return {
    code: "artifact_stub_regression",
    message:
      `The artifact body shrank from ${prior.sizeBytes} bytes to ${snapshot.sizeBytes} bytes for the same output path. ` +
      "This usually means a full artifact was replaced with a placeholder or stub. Restore the full artifact before finishing.",
    priorSizeBytes: prior.sizeBytes,
    currentSizeBytes: snapshot.sizeBytes,
    priorLineCount: prior.lineCount,
    currentLineCount: snapshot.lineCount,
  };
}

function inspectComponentStructure(source: string) {
  const issues: Array<{ code: string; message: string }> = [];
  const stack: string[] = [];
  const emitted = new Set<string>();
  const tagPattern = /<\/?([A-Z][A-Za-z0-9.]*)\b[^>]*\/?>/g;

  for (const match of source.matchAll(tagPattern)) {
    const raw = match[0];
    const componentName = (match[1] ?? "").split(".").pop() ?? "";
    const isClosing = raw.startsWith("</");
    const isSelfClosing = raw.endsWith("/>");

    if (isClosing) {
      const index = stack.lastIndexOf(componentName);
      if (index >= 0) {
        stack.length = index;
      }
      continue;
    }

    const parent = stack[stack.length - 1];
    if (
      componentName === "Section" &&
      stack.includes("Section") &&
      !emitted.has("nested_section")
    ) {
      issues.push({
        code: "nested_section",
        message: "Do not nest Section inside another Section.",
      });
      emitted.add("nested_section");
    }

    if (buildingComponentSet.has(componentName)) {
      if (
        parent !== "Section" &&
        !emitted.has("building_component_not_direct_section_child")
      ) {
        issues.push({
          code: "building_component_not_direct_section_child",
          message:
            "Building Components must be direct children of Section; do not wrap them in Root, custom components, or other Building Components.",
        });
        emitted.add("building_component_not_direct_section_child");
      }

      if (
        stack.some((name) => buildingComponentSet.has(name)) &&
        !emitted.has("nested_building_component")
      ) {
        issues.push({
          code: "nested_building_component",
          message:
            "Building Components must never be nested inside other Building Components.",
        });
        emitted.add("nested_building_component");
      }
    }

    if (!isSelfClosing) {
      stack.push(componentName);
    }
  }

  return issues;
}

function inspectGridPlacementWarnings(source: string) {
  const warnings: Array<{ code: string; message: string }> = [];
  const tagPattern = /<([A-Z][A-Za-z0-9.]*)\b([^>]*)>/g;
  const emitted = new Set<string>();

  for (const match of source.matchAll(tagPattern)) {
    const componentName = (match[1] ?? "").split(".").pop() ?? "";
    if (!buildingComponentSet.has(componentName)) {
      continue;
    }

    const openingTag = match[0];
    if (hasDynamicClassExpression(openingTag)) {
      continue;
    }

    const placement = extractGridPlacement(openingTag);
    const missing = [
      ["rowStart", "row-start-*"],
      ["rowEnd", "row-end-*"],
      ["columnStart", "col-start-*"],
      ["columnEnd", "col-end-*"],
    ].filter(([key]) => placement[key as keyof typeof placement] === undefined);

    if (
      missing.length > 0 &&
      !emitted.has("building_component_missing_grid_placement")
    ) {
      warnings.push({
        code: "building_component_missing_grid_placement",
        message: `Static inspection could not find complete row/column placement classes on ${componentName}. Runtime browser layout verification is authoritative.`,
      });
      emitted.add("building_component_missing_grid_placement");
    }

    if (
      placement.rowStart !== undefined &&
      placement.rowEnd !== undefined &&
      placement.rowEnd <= placement.rowStart &&
      !emitted.has("invalid_row_grid_placement")
    ) {
      warnings.push({
        code: "invalid_row_grid_placement",
        message: `${componentName} appears to have row-end less than or equal to row-start. Runtime browser layout verification is authoritative.`,
      });
      emitted.add("invalid_row_grid_placement");
    }

    if (
      placement.columnStart !== undefined &&
      placement.columnEnd !== undefined &&
      placement.columnEnd <= placement.columnStart &&
      !emitted.has("invalid_column_grid_placement")
    ) {
      warnings.push({
        code: "invalid_column_grid_placement",
        message: `${componentName} appears to have col-end less than or equal to col-start. Runtime browser layout verification is authoritative.`,
      });
      emitted.add("invalid_column_grid_placement");
    }
  }

  return warnings;
}

function hasDynamicClassExpression(source: string) {
  return (
    /\bclassName\s*=\s*\{/.test(source) || /\bclassNames\s*=\s*\{/.test(source)
  );
}

function extractGridPlacement(source: string) {
  const tokenText = Array.from(
    source.matchAll(
      /(?:^|[\s"'`{])(?:max-(?:sm|md|lg|xl|2xl):)?(?:row|col)-(?:start|end)-\d+/g,
    ),
    (match) => match[0],
  ).join(" ");

  return {
    rowStart: extractPlacementNumber(tokenText, "row-start"),
    rowEnd: extractPlacementNumber(tokenText, "row-end"),
    columnStart: extractPlacementNumber(tokenText, "col-start"),
    columnEnd: extractPlacementNumber(tokenText, "col-end"),
  };
}

function extractPlacementNumber(source: string, token: string) {
  const match = new RegExp("(?:^|[\\s\"'`{])" + token + "-(\\d+)").exec(source);
  return match?.[1] ? Number(match[1]) : undefined;
}

function inspectAntiSlopPatterns(source: string) {
  const issues: Array<{ code: string; message: string }> = [];
  const emojiIconPattern =
    /(?:<(?:Text|Button|Card)\b[^>]*>|["'`]\s*)(?:[^"'`<]{0,40})[✨🚀🎯⚡🔥💡📈🎨🛡🌟💪🎉👋🙌✅⭐🏆]/u;

  if (emojiIconPattern.test(source)) {
    issues.push({
      code: "emoji_feature_icon",
      message:
        "Do not use emoji as feature or UI icons; use component styling or an approved icon asset instead.",
    });
  }

  if (
    /\b(?:lorem ipsum|dolor sit amet|placeholder text|sample content|feature (?:one|two|three|1|2|3))\b/i.test(
      source,
    )
  ) {
    issues.push({
      code: "placeholder_content",
      message:
        "Replace placeholder or lorem-style content with specific product copy before finishing.",
    });
  }

  if (
    /(?:#6366f1|#4f46e5|#4338ca|#3730a3|#8b5cf6|#7c3aed|#a855f7)/i.test(source)
  ) {
    issues.push({
      code: "ai_default_indigo",
      message:
        "Avoid default AI-looking indigo/violet accent hex values; use the active design system tokens or a more intentional palette.",
    });
  }

  return issues;
}

function collectLayoutHardFailures(result: Array<{ [key: string]: unknown }>) {
  const report = parseLayoutReport(result);
  if (!report) {
    return [
      {
        code: "layout_report_unreadable",
        message:
          "inspect_layout did not return a parseable layout report; rerun layout inspection before finishing.",
      },
    ];
  }

  const issues: Array<Record<string, unknown>> = [];
  const hasDocumentHorizontalOverflow = Boolean(
    report.document?.hasHorizontalOverflow,
  );

  if (hasDocumentHorizontalOverflow) {
    issues.push({
      code: "layout_horizontal_overflow",
      message: "The rendered document has horizontal overflow.",
      document: report.document,
      viewport: report.viewport,
    });
  }

  for (const element of report.elements ?? []) {
    const elementIssues = Array.isArray(element?.issues) ? element.issues : [];
    const blocking = elementIssues.filter((issue) =>
      isBlockingElementLayoutIssue(
        element,
        String(issue),
        hasDocumentHorizontalOverflow,
      ),
    );

    if (blocking.length > 0) {
      issues.push({
        code: "layout_element_issue",
        message: `A rendered element has blocking layout issues: ${blocking.join(", ")}.`,
        element,
      });
    }
  }

  for (const image of report.images ?? []) {
    const imageIssues = Array.isArray(image?.issues) ? image.issues : [];
    const blocking = imageIssues.filter((issue) =>
      isBlockingImageLayoutIssue(image, String(issue)),
    );

    if (blocking.length > 0) {
      issues.push({
        code: "layout_image_issue",
        message: `An image has blocking layout issues: ${blocking.join(", ")}.`,
        image,
      });
    }
  }

  const blockingGridAreaContainment = (report.gridAreaContainment ?? []).filter(
    isBlockingGridAreaContainment,
  );

  if (blockingGridAreaContainment.length > 0) {
    issues.push({
      code: "layout_grid_area_containment",
      message:
        "Section or tool content exceeds its assigned GridArea containment.",
      gridAreaContainment: blockingGridAreaContainment,
    });
  }

  const blockingOverlaps = (report.overlaps ?? []).filter(isBlockingOverlap);

  if (blockingOverlaps.length > 0) {
    issues.push({
      code: "layout_unintended_overlap",
      message:
        "Visible sibling elements overlap. If this was intentional, adjust the artifact so the overlap is explicit and non-destructive.",
      overlaps: blockingOverlaps,
    });
  }

  return issues;
}

function buildLayoutInspectionSummary(
  layoutIssues: Array<Record<string, unknown>>,
) {
  const repairHints = buildLayoutRepairHints(layoutIssues);
  const summary: {
    verification: {
      ok: boolean;
      issues: Array<Record<string, unknown>>;
    };
    repairHints?: Array<Record<string, unknown>>;
  } = {
    verification: {
      ok: layoutIssues.length === 0,
      issues: layoutIssues,
    },
  };

  if (repairHints.length > 0) {
    summary.repairHints = repairHints;
  }

  return summary;
}

function buildLayoutRepairHints(layoutIssues: Array<Record<string, unknown>>) {
  const overflowingCards: Array<Record<string, unknown>> = [];
  const gridOverflows: Array<Record<string, unknown>> = [];
  const overlaps: unknown[] = [];

  for (const issue of layoutIssues) {
    const code = getStringProperty(issue, "code");

    if (code === "layout_element_issue") {
      const element = getRecordProperty(issue, "element");
      const elementIssues = Array.isArray(element?.issues)
        ? element.issues.map(String)
        : [];
      const dataSlot = getStringProperty(element, "dataSlot");
      const hasVerticalOverflow = elementIssues.some((elementIssue) =>
        [
          "text-overflow-y",
          "clipped-content-y",
          "tool-grid-area-overflow",
        ].includes(elementIssue),
      );

      if (dataSlot === "card" && hasVerticalOverflow && element) {
        overflowingCards.push(element);
      }
    }

    if (code === "layout_grid_area_containment") {
      const issueGridOverflows = issue.gridAreaContainment;
      if (Array.isArray(issueGridOverflows)) {
        gridOverflows.push(
          ...issueGridOverflows.flatMap((value) => {
            const record = asRecord(value);
            return record ? [record] : [];
          }),
        );
      }
    }

    if (code === "layout_unintended_overlap") {
      const issueOverlaps = issue.overlaps;
      if (Array.isArray(issueOverlaps)) {
        overlaps.push(...issueOverlaps);
      }
    }
  }

  const hints: Array<Record<string, unknown>> = [];

  if (overflowingCards.length >= 2) {
    hints.push({
      code: "repeated-card-content-overflow",
      severity: "structural",
      count: overflowingCards.length,
      sampleTexts: compactLayoutSamples(
        overflowingCards.map((card) => getStringProperty(card, "text")),
      ),
      message:
        "Multiple cards overflow vertically in this viewport. Stop patching individual card heights; restructure the affected Section for this breakpoint.",
      nextActions: [
        "increase the responsive Section height/rows",
        "give cards larger row spans or stack them",
        "reduce per-card content density",
        "rerun inspect_layout at the failing viewport before taking fresh screenshot/snapshot evidence",
      ],
    });
  }

  if (gridOverflows.length >= 1) {
    hints.push({
      code: "grid-area-content-overflow",
      severity: gridOverflows.length >= 2 ? "structural" : "targeted",
      count: gridOverflows.length,
      selectors: compactLayoutSamples(
        gridOverflows.map((overflow) =>
          getStringProperty(overflow, "selector"),
        ),
      ),
      message:
        "Rendered content exceeds its assigned GridArea. Fix the responsive grid structure instead of relying on padding or z-index tweaks.",
      nextActions: [
        "increase viewport-specific rows or Section height",
        "expand the overflowing component's row/column span",
        "move dense content into a separate row or stack",
      ],
    });
  }

  if (overlaps.length >= 3) {
    hints.push({
      code: "repeated-unintended-overlap",
      severity: "structural",
      count: overlaps.length,
      message:
        "Several visible siblings overlap in this viewport. Treat this as a layout strategy failure and rewrite the affected Section's responsive placement.",
      nextActions: [
        "separate the overlapping components into non-overlapping grid areas",
        "increase responsive rows/height before reducing spacing",
        "avoid z-index or absolute-position patches unless the overlap is intentional and explicit",
      ],
    });
  }

  if (hints.filter((hint) => hint.severity === "structural").length >= 2) {
    hints.unshift({
      code: "layout-strategy-failure",
      severity: "structural",
      message:
        "The same viewport has multiple structural layout failures. Rewrite the full affected Section for this breakpoint before continuing verification.",
      nextActions: [
        "inspect the JSX for the affected Section",
        "rewrite its responsive grid/placement as a coherent layout",
        "run inspect_layout at the failing viewport as the next check",
      ],
    });
  }

  return hints;
}

function compactLayoutSamples(values: Array<string | undefined>) {
  const samples: string[] = [];

  for (const value of values) {
    const sample = value?.trim();
    if (!sample || samples.includes(sample)) {
      continue;
    }

    samples.push(sample.length > 80 ? `${sample.slice(0, 77)}...` : sample);
    if (samples.length >= 3) {
      break;
    }
  }

  return samples;
}

function isBlockingElementLayoutIssue(
  element: { issues?: unknown[]; [key: string]: unknown },
  issue: string,
  hasDocumentHorizontalOverflow: boolean,
) {
  const dataSlot = getStringProperty(element, "dataSlot");
  const computed = getRecordProperty(element, "computed");

  if (issue === "zero-size") {
    return !isHiddenComputedStyle(computed);
  }

  if (issue === "empty-action") {
    return !isHiddenComputedStyle(computed) && !isCarouselSlot(dataSlot);
  }

  if (
    isCarouselSlot(dataSlot) &&
    [
      "outside-viewport-x",
      "text-overflow-x",
      "clipped-content-x",
      "tool-grid-area-overflow",
    ].includes(issue)
  ) {
    return hasDocumentHorizontalOverflow;
  }

  if (issue === "text-overflow-y") {
    return isStrictTextOverflowY(element);
  }

  return [
    "outside-viewport-x",
    "text-overflow-x",
    "clipped-content-x",
    "clipped-content-y",
  ].includes(issue);
}

function isBlockingImageLayoutIssue(
  image: { issues?: unknown[]; [key: string]: unknown },
  issue: string,
) {
  if (issue === "missing-alt" || issue === "broken-image") {
    return true;
  }

  if (issue === "distorted-aspect-ratio") {
    return !isObjectFitImage(image);
  }

  return false;
}

function isBlockingGridAreaContainment(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return true;
  }

  const dataSlot = getStringProperty(record, "dataSlot");
  const selector = getStringProperty(record, "selector");

  return !isCarouselSlot(dataSlot) && !isCarouselSelector(selector);
}

function isBlockingOverlap(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return true;
  }

  const a = getStringProperty(record, "a");
  const b = getStringProperty(record, "b");

  if (isStickyNavigationOverlap(record)) {
    return false;
  }

  if (isSameCarouselContextOverlap(record)) {
    return false;
  }

  return !isCarouselSelector(a) && !isCarouselSelector(b);
}

function isStickyNavigationOverlap(record: Record<string, unknown>) {
  return (
    record.aStickyNavLayer === true ||
    record.bStickyNavLayer === true ||
    isNavbarSlot(getStringProperty(record, "aDataSlot")) ||
    isNavbarSlot(getStringProperty(record, "bDataSlot"))
  );
}

function isSameCarouselContextOverlap(record: Record<string, unknown>) {
  const aCarouselRootIndex = getNumberProperty(record, "aCarouselRootIndex");
  const bCarouselRootIndex = getNumberProperty(record, "bCarouselRootIndex");

  if (
    aCarouselRootIndex !== undefined &&
    bCarouselRootIndex !== undefined &&
    aCarouselRootIndex === bCarouselRootIndex
  ) {
    return true;
  }

  return (
    isCarouselContextSide(record, "a") && isCarouselContextSide(record, "b")
  );
}

function isCarouselContextSide(
  record: Record<string, unknown>,
  side: "a" | "b",
) {
  const selector = getStringProperty(record, side);
  const dataSlot = getStringProperty(record, `${side}DataSlot`);
  const ancestorSlots = getStringArrayProperty(record, `${side}AncestorSlots`);

  return (
    isCarouselSelector(selector) ||
    isCarouselSlot(dataSlot) ||
    ancestorSlots.some(isCarouselSlot)
  );
}

function isObjectFitImage(image: { [key: string]: unknown }) {
  const computed = getRecordProperty(image, "computed");
  const objectFit = getStringProperty(computed, "objectFit");

  return objectFit === "cover" || objectFit === "contain";
}

function isStrictTextOverflowY(element: { [key: string]: unknown }) {
  const computed = getRecordProperty(element, "computed");
  const metrics = getRecordProperty(element, "metrics");
  const overflowY = getStringProperty(computed, "overflowY");

  if (!["hidden", "clip", "auto"].includes(overflowY ?? "")) {
    return false;
  }

  const scrollHeight = getNumberProperty(metrics, "scrollHeight");
  const clientHeight = getNumberProperty(metrics, "clientHeight");
  if (scrollHeight === undefined || clientHeight === undefined) {
    return false;
  }

  const lineHeight = parseNumericCssValue(
    getStringProperty(computed, "lineHeight"),
  );
  const threshold = Math.max(6, (lineHeight ?? 0) * 0.25);

  return scrollHeight - clientHeight > threshold;
}

function isHiddenComputedStyle(record: Record<string, unknown> | undefined) {
  return (
    getStringProperty(record, "display") === "none" ||
    getStringProperty(record, "visibility") === "hidden" ||
    getStringProperty(record, "opacity") === "0" ||
    record?.hiddenByAncestor === true
  );
}

function isCarouselSlot(value: string | undefined) {
  return value === "carousel" || value?.startsWith("carousel-") === true;
}

function isCarouselSelector(value: string | undefined) {
  return value?.includes('data-slot="carousel') === true;
}

function isNavbarSlot(value: string | undefined) {
  return value === "navbar" || value?.startsWith("navbar-") === true;
}

function getRecordProperty(
  value: Record<string, unknown> | undefined,
  key: string,
) {
  return asRecord(value?.[key]);
}

function getStringProperty(
  value: Record<string, unknown> | undefined,
  key: string,
) {
  const next = value?.[key];
  return typeof next === "string" ? next : undefined;
}

function getNumberProperty(
  value: Record<string, unknown> | undefined,
  key: string,
) {
  const next = value?.[key];
  return typeof next === "number" ? next : undefined;
}

function getStringArrayProperty(
  value: Record<string, unknown> | undefined,
  key: string,
) {
  const next = value?.[key];
  return Array.isArray(next)
    ? next.filter((item): item is string => typeof item === "string")
    : [];
}

function parseNumericCssValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

type LayoutReport = {
  viewport?: unknown;
  document?: {
    hasHorizontalOverflow?: boolean;
    [key: string]: unknown;
  };
  elements?: Array<{ issues?: unknown[]; [key: string]: unknown }>;
  images?: Array<{ issues?: unknown[]; [key: string]: unknown }>;
  overlaps?: unknown[];
  gridAreaContainment?: unknown[];
};

function parseLayoutReport(
  result: Array<{ [key: string]: unknown }>,
): LayoutReport | null {
  for (const item of result) {
    if (typeof item.text !== "string") {
      continue;
    }

    const text = item.text.trim();
    const parsed = unwrapLayoutReport(tryParseJson(text));
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function unwrapLayoutReport(value: unknown): LayoutReport | null {
  if (isLayoutReport(value)) {
    return value;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["result", "value", "data"]) {
    const nested = unwrapLayoutReport(record[key]);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function isLayoutReport(value: unknown): value is LayoutReport {
  return (
    typeof value === "object" &&
    value !== null &&
    "document" in value &&
    "elements" in value &&
    "images" in value
  );
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
      rawHasHorizontalOverflow: boolean;
      hasHorizontalOverflow: boolean;
      hasVerticalOverflow: boolean;
    };
    elements: unknown[];
    overlaps: unknown[];
    images: unknown[];
    gridAreaContainment: unknown[];
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
      rawHasHorizontalOverflow:
        scrolling.scrollWidth > scrolling.clientWidth + 1,
      hasHorizontalOverflow: false,
      hasVerticalOverflow: scrolling.scrollHeight > scrolling.clientHeight + 1,
    },
    elements: [],
    overlaps: [],
    images: [],
    gridAreaContainment: [],
  };

  const nodes = Array.from(
    doc.querySelectorAll(
      "[data-slot], img, button, a, input, textarea, [role]",
    ),
  ) as any[];

  function rectToObject(rect: any) {
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    };
  }

  function selectorFor(el: any) {
    return el.getAttribute("data-slot")
      ? `[data-slot="${el.getAttribute("data-slot")}"]`
      : el.tagName.toLowerCase();
  }

  function isCarouselDataSlot(value: string | null | undefined) {
    return value === "carousel" || value?.startsWith("carousel-") === true;
  }

  function isNavbarDataSlot(value: string | null | undefined) {
    return value === "navbar" || value?.startsWith("navbar-") === true;
  }

  function isCarouselInternalContextRecord(record: {
    dataSlot?: string;
    ancestorSlots?: string[];
  }) {
    if (record.dataSlot === "carousel") {
      return false;
    }

    return (
      isCarouselDataSlot(record.dataSlot) ||
      (record.ancestorSlots ?? []).some(isCarouselDataSlot)
    );
  }

  function getAncestorDataSlots(el: any) {
    const slots: string[] = [];
    let parent = el.parentElement;

    while (parent && parent !== doc.body && parent !== doc.documentElement) {
      const slot = parent.getAttribute("data-slot");

      if (slot) {
        slots.push(slot);
      }

      parent = parent.parentElement;
    }

    return slots.slice(0, 8);
  }

  function closestDataSlotElement(
    el: any,
    predicate: (value: string | null | undefined) => boolean,
  ) {
    let current: any = el;

    while (current && current !== doc.body && current !== doc.documentElement) {
      if (predicate(current.getAttribute("data-slot"))) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  function containsDataSlot(
    el: any,
    predicate: (value: string | null | undefined) => boolean,
  ) {
    const descendants = Array.from(el.querySelectorAll("[data-slot]")) as any[];

    return descendants.some((descendant) =>
      predicate(descendant.getAttribute("data-slot")),
    );
  }

  function isInStickyNavLayer(el: any) {
    let current: any = el;

    while (current && current !== doc.body && current !== doc.documentElement) {
      const style = win.getComputedStyle(current);

      if (style.position === "sticky" || style.position === "fixed") {
        const slot = current.getAttribute("data-slot");

        return (
          isNavbarDataSlot(slot) ||
          closestDataSlotElement(current, isNavbarDataSlot) !== null ||
          containsDataSlot(current, isNavbarDataSlot)
        );
      }

      current = current.parentElement;
    }

    return false;
  }

  function isVisibleElement(el: any) {
    const rect = el.getBoundingClientRect();
    const style = win.getComputedStyle(el);

    return (
      rect.width > 1 &&
      rect.height > 1 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) !== 0
    );
  }

  function isHiddenByAncestor(el: any) {
    let parent = el.parentElement;

    while (parent && parent !== doc.body && parent !== doc.documentElement) {
      const parentStyle = win.getComputedStyle(parent);

      if (
        parentStyle.display === "none" ||
        parentStyle.visibility === "hidden" ||
        Number(parentStyle.opacity) === 0
      ) {
        return true;
      }

      parent = parent.parentElement;
    }

    return false;
  }

  function getVisibleContentBounds(descendants: any[]) {
    const visibleDescendants = descendants.filter(isVisibleElement);

    if (visibleDescendants.length === 0) {
      return null;
    }

    const bounds = visibleDescendants.reduce(
      (next, descendant) => {
        const rect = descendant.getBoundingClientRect();

        return {
          top: Math.min(next.top, rect.top),
          right: Math.max(next.right, rect.right),
          bottom: Math.max(next.bottom, rect.bottom),
          left: Math.min(next.left, rect.left),
        };
      },
      {
        top: Infinity,
        right: -Infinity,
        bottom: -Infinity,
        left: Infinity,
      },
    );

    return {
      x: bounds.left,
      y: bounds.top,
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top,
      ...bounds,
    };
  }

  function findBoundsOverflow(containerRect: any, bounds: any) {
    const tolerance = 1;

    return {
      top: Math.max(0, containerRect.top - bounds.top - tolerance),
      right: Math.max(0, bounds.right - containerRect.right - tolerance),
      bottom: Math.max(0, bounds.bottom - containerRect.bottom - tolerance),
      left: Math.max(0, containerRect.left - bounds.left - tolerance),
    };
  }

  function hasBoundsOverflow(overflow: Record<string, number>) {
    return Object.values(overflow).some((value) => value > 0);
  }

  function recordHasVisibleHorizontalViewportOverflow(record: {
    rect: { width: number; height: number; left: number; right: number };
    issues: string[];
  }) {
    return (
      record.rect.width > 1 &&
      record.rect.height > 1 &&
      !record.issues.includes("invisible") &&
      !record.issues.includes("zero-size") &&
      (record.rect.left < -1 || record.rect.right > win.innerWidth + 1)
    );
  }

  const gridAreaContainment: unknown[] = [];

  const records = nodes.map((el, index) => {
    const rect = el.getBoundingClientRect();
    const style = win.getComputedStyle(el);
    const hiddenByAncestor = isHiddenByAncestor(el);
    const carouselRoot = closestDataSlotElement(el, isCarouselDataSlot);
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
    if (
      ["fixed", "sticky", "absolute"].includes(style.position) &&
      (rect.top < -1 || rect.bottom > win.innerHeight + 1)
    ) {
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
      selector: selectorFor(el),
      dataSlot: el.getAttribute("data-slot") || undefined,
      ancestorSlots: getAncestorDataSlots(el),
      carouselRootIndex: carouselRoot ? nodes.indexOf(carouselRoot) : undefined,
      stickyNavLayer: isInStickyNavLayer(el),
      role: el.getAttribute("role"),
      text: text.slice(0, 80),
      rect: rectToObject(rect),
      computed: {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        position: style.position,
        zIndex: style.zIndex,
        lineHeight: style.lineHeight,
        hiddenByAncestor,
      },
      metrics: {
        scrollWidth: el.scrollWidth,
        scrollHeight: el.scrollHeight,
        clientWidth: el.clientWidth,
        clientHeight: el.clientHeight,
      },
      issues,
    };
  });

  const recordsByElement = new Map(
    records.map((record) => [nodes[record.index], record]),
  );

  report.document.hasHorizontalOverflow =
    report.document.rawHasHorizontalOverflow &&
    records.some(
      (record) =>
        recordHasVisibleHorizontalViewportOverflow(record) &&
        !isCarouselInternalContextRecord(record),
    );

  for (const section of Array.from(
    doc.querySelectorAll('[data-slot="section"]'),
  ) as any[]) {
    const sectionRect = section.getBoundingClientRect();
    const toolElements = (Array.from(section.children) as any[]).filter(
      isVisibleElement,
    );
    const contentBounds = getVisibleContentBounds(toolElements);

    if (!contentBounds) {
      continue;
    }

    const overflow = findBoundsOverflow(sectionRect, contentBounds);

    if (hasBoundsOverflow(overflow)) {
      const record = recordsByElement.get(section);
      record?.issues.push("section-grid-area-overflow");
      gridAreaContainment.push({
        type: "section",
        issue: "section-grid-area-overflow",
        selector: selectorFor(section),
        containerRect: rectToObject(sectionRect),
        contentBounds,
        overflow,
        children: toolElements.map((child) => ({
          selector: selectorFor(child),
          dataSlot: child.getAttribute("data-slot") || undefined,
          rect: rectToObject(child.getBoundingClientRect()),
        })),
      });
    }
  }

  for (const tool of Array.from(
    doc.querySelectorAll('[data-slot="section"] > [data-slot]'),
  ) as any[]) {
    const toolRect = tool.getBoundingClientRect();
    const descendants = (
      Array.from(
        tool.querySelectorAll(
          "[data-slot], img, button, a, input, textarea, [role]",
        ),
      ) as any[]
    ).filter((descendant: any) => descendant !== tool);
    const contentBounds = getVisibleContentBounds(descendants);

    if (!contentBounds) {
      continue;
    }

    const overflow = findBoundsOverflow(toolRect, contentBounds);

    if (hasBoundsOverflow(overflow)) {
      const record = recordsByElement.get(tool);
      record?.issues.push("tool-grid-area-overflow");
      gridAreaContainment.push({
        type: "tool",
        issue: "tool-grid-area-overflow",
        selector: selectorFor(tool),
        dataSlot: tool.getAttribute("data-slot") || undefined,
        containerRect: rectToObject(toolRect),
        contentBounds,
        overflow,
      });
    }
  }

  report.images = Array.from(doc.images).map((img: any) => {
    const rect = img.getBoundingClientRect();
    const style = win.getComputedStyle(img);
    const carouselRoot = closestDataSlotElement(img, isCarouselDataSlot);
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
      dataSlot: img.getAttribute("data-slot") || undefined,
      ancestorSlots: getAncestorDataSlots(img),
      carouselRootIndex: carouselRoot ? nodes.indexOf(carouselRoot) : undefined,
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
      computed: {
        objectFit: style.objectFit,
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
          aDataSlot: a.dataSlot,
          bDataSlot: b.dataSlot,
          aAncestorSlots: a.ancestorSlots,
          bAncestorSlots: b.ancestorSlots,
          aCarouselRootIndex: a.carouselRootIndex,
          bCarouselRootIndex: b.carouselRootIndex,
          aStickyNavLayer: a.stickyNavLayer,
          bStickyNavLayer: b.stickyNavLayer,
          area,
        });
      }
    }
  }

  report.elements = records
    .filter((record) => record.dataSlot || record.issues.length > 0)
    .slice(0, 80);
  report.overlaps = overlaps.slice(0, 30);
  report.gridAreaContainment = gridAreaContainment.slice(0, 30);

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
  page: unknown;
  targetToolId?: string;
  onProgress?: (text: string) => void;
}

export async function run({
  prompt,
  page,
  targetToolId,
  designSystemId,
  onProgress,
}: Option) {
  const previousPage = pageDocumentSchema.parse(page);
  const currentJsx = pageDocumentToJsx(previousPage);
  const response = await runAgent(
    `
  ${await getDesignSystemPropmpt(designSystemId)}

  ${getUserPrompt({
    currentJsx,
    userPrompt: prompt,
    targetToolId,
  })}
  `,
    { onProgress },
  );

  if (!response.artifactPath) {
    throw new Error("The design agent did not return a final JSX artifact.");
  }

  const artifactSource = await readFile(
    join(
      paths.workspaceDir,
      toWorkspaceRelativePath(response.artifactPath, paths.workspaceDir),
    ),
    "utf8",
  );
  const nextPage = jsxToPageDocument(artifactSource, { previousPage });
  const patch =
    targetToolId === undefined
      ? pagePatchSchema.parse([{ op: "replacePage", page: nextPage }])
      : pagePatchSchema.parse(
          filterPatchByTargetTool(diffPageDocuments(previousPage, nextPage), {
            targetToolId,
          }) as PagePatch,
        );

  return {
    message: response.message,
    previewUrl: response.path,
    patch,
  };
}

async function runAgent(
  prompt: string,
  options: { onProgress?: (text: string) => void } = {},
) {
  monitorLog("run.start", { prompt: summarizeText(prompt, 6000) });
  finalPath = "";

  try {
    const result = await runner.run(agent, prompt, {
      session,
      sandbox: {
        session: sandboxSession,
      },
      maxTurns: 200,
      stream: true,
    });

    let modelOutputBuffer = "";
    const tokenUsage = new TokenUsageAccumulator();
    const flushModelOutput = (reason: string) => {
      if (!modelOutputBuffer) {
        return;
      }
      monitorLog("model.output", {
        reason,
        text: modelOutputBuffer,
      });
      options.onProgress?.(modelOutputBuffer);
      modelOutputBuffer = "\n\n";
    };

    for await (const event of result) {
      if (event.type === "raw_model_stream_event") {
        tokenUsage.addFromEvent(event.data);
      }

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
            item: summarizeRunItem(event.item),
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
      const usageReport = tokenUsage.toReport();

      monitorLog("token.usage", {
        artifactPath: p,
        lastResponseId: result.lastResponseId,
        usage: usageReport,
      });

      return {
        path: `${previewBaseUrl}/preview-artifacts/${getPreviewArtifactId(p)}`,
        artifactPath: p,
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

class TokenUsageAccumulator {
  #responses = new Map<
    string,
    { id?: string; model?: string; usage: ResponseUsage }
  >();

  addFromEvent(event: unknown) {
    for (const response of extractResponsesWithUsage(event)) {
      const fallbackKey = `${this.#responses.size}:${safeStringify(response.usage)}`;
      this.#responses.set(response.id ?? fallbackKey, response);
    }
  }

  toReport(): TokenUsageTotals | null {
    if (this.#responses.size === 0) {
      return null;
    }

    const responses = Array.from(this.#responses.values());
    const totals = responses.reduce<TokenUsageTotals>(
      (total, response) => {
        total.input_tokens += response.usage.input_tokens;
        total.output_tokens += response.usage.output_tokens;
        total.total_tokens += response.usage.total_tokens;
        total.cached_tokens +=
          response.usage.input_tokens_details?.cached_tokens ?? 0;
        total.reasoning_tokens +=
          response.usage.output_tokens_details?.reasoning_tokens ?? 0;
        return total;
      },
      {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cached_tokens: 0,
        reasoning_tokens: 0,
      },
    );

    return totals;
  }
}

function extractResponsesWithUsage(
  value: unknown,
): Array<{ id?: string; model?: string; usage: ResponseUsage }> {
  const found: Array<{ id?: string; model?: string; usage: ResponseUsage }> =
    [];
  collectResponsesWithUsage(value, found, new WeakSet<object>());
  return found;
}

function collectResponsesWithUsage(
  value: unknown,
  found: Array<{ id?: string; model?: string; usage: ResponseUsage }>,
  seen: WeakSet<object>,
) {
  if (typeof value !== "object" || value === null) {
    return;
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  const record = value as Record<string, unknown>;
  if (isResponseUsage(record.usage)) {
    found.push({
      id: typeof record.id === "string" ? record.id : undefined,
      model: typeof record.model === "string" ? record.model : undefined,
      usage: record.usage,
    });
  }

  for (const nestedValue of Object.values(record)) {
    collectResponsesWithUsage(nestedValue, found, seen);
  }
}

function isResponseUsage(value: unknown): value is ResponseUsage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<ResponseUsage>;
  return (
    typeof record.input_tokens === "number" &&
    typeof record.output_tokens === "number" &&
    typeof record.total_tokens === "number"
  );
}

function getRunItemName(item: unknown) {
  if (typeof item !== "object" || item === null) {
    return undefined;
  }

  const record = item as Record<string, unknown>;
  const rawName =
    record.name ??
    record.toolName ??
    record.tool_name ??
    record.type ??
    record.rawItem;

  if (typeof rawName === "string") {
    return rawName;
  }

  if (typeof rawName === "object" && rawName !== null) {
    return getRunItemName(rawName);
  }

  return undefined;
}

function summarizeRunItem(item: unknown) {
  if (typeof item !== "object" || item === null) {
    return item;
  }

  const record = item as Record<string, unknown>;

  return {
    type: record.type,
    name: getRunItemName(record),
    status: record.status,
    id: record.id,
  };
}

function monitorLog(event: string, payload: unknown) {
  const time = formatLocalLogTime();
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

function formatLocalLogTime(date = new Date()) {
  const timezoneOffsetMinutes = -date.getTimezoneOffset();
  const sign = timezoneOffsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(timezoneOffsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const offsetMinutes = String(absoluteOffset % 60).padStart(2, "0");
  const localTime = new Date(date.getTime() + timezoneOffsetMinutes * 60_000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");

  return `${localTime}${sign}${offsetHours}:${offsetMinutes}`;
}

function summarizeText(value: string, maxLength = 12000) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n[truncated ${value.length - maxLength} chars]`;
}

function sanitizeForLog(
  value: unknown,
  seen = new WeakSet<object>(),
  key?: string,
): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string") {
    if (value.startsWith("data:image/")) {
      return `[redacted image data URL, ${value.length} chars]`;
    }

    const parsedValue = parseJsonLogField(key, value);
    if (parsedValue !== undefined) {
      return sanitizeForLog(parsedValue, seen, key);
    }

    return summarizeText(value);
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
      result[key] = sanitizeForLog(nestedValue, seen, key);
    }

    return result;
  }

  return value;
}

function parseJsonLogField(key: string | undefined, value: string) {
  if (key !== "arguments" && key !== "result") {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (
    (!trimmedValue.startsWith("{") || !trimmedValue.endsWith("}")) &&
    (!trimmedValue.startsWith("[") || !trimmedValue.endsWith("]"))
  ) {
    return undefined;
  }

  try {
    return JSON.parse(trimmedValue) as unknown;
  } catch {
    return undefined;
  }
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
