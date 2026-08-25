import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getArtifactLogFile } from "./artifactLog.ts";

export type AgentLimits = {
  /** Maximum number of Designer Agent turns in one run. */
  maxTurns: number;
  /** Maximum repair-verification calls before the first review and per failed-review repair cycle. */
  maxRepairRequests: number;
  /** Maximum independent visual-review attempts across the whole run. */
  maxFinalVisualRuns: number;
  /** Maximum automatic Designer resumptions after review rejection. */
  maxAcceptanceRecoveries: number;
};

export type BrowserViewportName = "desktop" | "tablet" | "mobile";

export type BrowserViewportConfig = {
  /** Stable viewport identifier used in reports and repair evidence. */
  name: BrowserViewportName;
  /** CSS viewport width in pixels. */
  width: number;
  /** CSS viewport height in pixels. */
  height: number;
  /** Optional Chrome DevTools emulation descriptor for device traits. */
  emulateViewport?: string;
};

export type ResponsiveBreakpointName = "sm" | "md" | "lg" | "xl" | "2xl";

export type ResponsiveBreakpoints = Record<ResponsiveBreakpointName, string>;

const appDir = dirname(fileURLToPath(import.meta.url));
/** Local preview server port shared by HTTP serving and browser inspection. */
const serverPort = 3333;
const paths = {
  /** Absolute directory containing the runtime application modules. */
  appDir,
  /** Absolute directory containing Agent skill instructions. */
  skillDir: join(appDir, "../skills"),
  /** Absolute directory containing component documentation. */
  componentsDir: join(appDir, "../components"),
  /** Persistent workspace used for accepted artifacts. */
  workspaceDir: join(appDir, "../workspace"),
  /** Directory for system and per-artifact logs. */
  logsDir: join(appDir, "../.logs"),
  /** Directory for transient registries and runtime state. */
  tmpDir: join(appDir, "../.tmp"),
  /** Directory containing the visual-pattern reference documents. */
  designSystemDir: join(appDir, "../design-system"),
};

const browserViewports: readonly BrowserViewportConfig[] = [
  { name: "desktop", width: 1440, height: 1200 },
  { name: "tablet", width: 768, height: 1100 },
  {
    name: "mobile",
    width: 390,
    height: 1000,
    emulateViewport: "390x1000x2,mobile,touch",
  },
] as const;

const imagePlaceholderSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#eeeae4"/><path d="M390 520l145-165 105 120 70-80 100 125H390z" fill="#c9c1b7"/><circle cx="470" cy="285" r="42" fill="#c9c1b7"/></svg>',
)}`;

export const agentConfig = {
  /** Human-readable identity exposed to the Agent runtime. */
  identity: {
    /** Display name used for the artifact-authoring Agent. */
    name: "Designer",
  },
  /** Filesystem locations derived from this module's directory. */
  paths,
  /** Local preview HTTP server settings. */
  server: {
    /** TCP port used by the preview server. */
    port: serverPort,
    /** URL route that serves registered workspace artifacts. */
    workspaceFilesRoute: "/workspace",
  },
  /** Model clients and model-selection settings. */
  model: {
    // Keep the secret outside source control; all non-secret model settings
    // are configured directly in this file.
    /** OpenAI API key read from the process environment. */
    apiKey: process.env.OPEN_AI_KEY,
    /** Optional OpenAI-compatible API endpoint override. */
    baseURL: undefined,
    /** Optional outbound HTTP proxy used by model requests. */
    proxyURL: "http://127.0.0.1:7897",
    /** Maximum duration of one model request, in milliseconds. */
    requestTimeoutMs: 15 * 60 * 1_000,
    /** Model used by the artifact-authoring Designer Agent. */
    designerModel: "gpt-5.6-luna",
    /** Model used by the independent read-only Reviewer Agent. */
    reviewerModel: "gpt-5.6-luna",
    /** Whether model responses may be retained by the API provider. */
    storeResponses: false,
  },
  /** Run-wide authoring, verification, and recovery budgets. */
  limits: {
    /** Maximum number of Designer Agent turns in one run. */
    maxTurns: 80,
    /** Repair-verification calls per review cycle, plus one reserved final verification. */
    maxRepairRequests: 10,
    /** Initial review plus two bounded Designer repair/review cycles. */
    maxFinalVisualRuns: 3,
    /** Designer resumptions allowed after the first two review rejections. */
    maxAcceptanceRecoveries: 2,
  } satisfies AgentLimits,
  /** Multi-page Site orchestration settings. */
  site: {
    /**
     * Maximum durations for Site workers, in milliseconds.
     * Set an individual value to 0 to disable that timeout.
     */
    timeouts: {
      /** Maximum duration of shared Header/Footer generation. */
      shellAgentMs: 2 * 60 * 1_000,
      /** Maximum duration of one page-generation Agent, including its bounded independent visual reviews. */
      pageAgentMs: 30 * 60 * 1_000,
      /** Maximum duration of one complete-site Reviewer pass. */
      reviewerMs: 5 * 60 * 1_000,
    },
  },
  /** Independent Reviewer behavior and evidence budgets. */
  review: {
    /** Enables independent review requirements in the Designer prompt and flow. */
    reviewerCritiqueEnabled: true,
    /** Maximum turns available to one short-lived Reviewer Agent session. */
    maxAgentTurns: 14,
    /** Maximum total tool calls in one Reviewer Agent session. */
    maxToolCalls: 14,
    /** Maximum screenshots the Reviewer may capture across candidate and baseline. */
    maxScreenshots: 10,
    /** Maximum distinct widths the Reviewer may inspect beyond the fixed matrix. */
    maxResponsiveWidths: 4,
    /** Maximum isolated interaction probes in one Reviewer session. */
    maxInteractionProbes: 3,
    /** Maximum fresh Reviewer Agent executions after runtime-level failures. */
    maxExecutionAttempts: 2,
    /** Maximum correction passes for internally inconsistent structured reviews. */
    maxSemanticCorrectionAttempts: 1,
  },
  /** Image fallbacks used when referenced media cannot be loaded. */
  images: {
    /** Inline SVG used as the deterministic broken-image replacement. */
    placeholderSrc: imagePlaceholderSrc,
  },
  /** Runtime logging and optional evaluation-evidence destinations. */
  logging: {
    /** Resolves the log file for one artifact identifier. */
    artifactLogFile: (artifactId: string) =>
      getArtifactLogFile(paths.logsDir, artifactId),
    /** Shared log file for process-wide runtime events. */
    systemLogFile: join(paths.logsDir, "system.log"),
    /** Optional directory for persisted evaluation evidence; disabled when undefined. */
    evaluationEvidenceDir: undefined as string | undefined,
  },
  /** Persistent preview-artifact registry settings. */
  artifacts: {
    /** Registry path, optionally overridden for isolated processes or tests. */
    registryFile:
      process.env.PREVIEW_ARTIFACT_REGISTRY_FILE ??
      join(paths.tmpDir, "preview-artifacts.json"),
  },
  /** Filesystem sandbox exposed to Designer and Reviewer runtimes. */
  sandbox: {
    /** Virtual root containing the isolated artifact workspace. */
    root: "/workspace",
  },
  /** Browser verification, readiness, and DevTools connection settings. */
  browser: {
    /** Base URL used to construct registered artifact preview URLs. */
    previewBaseURL: `http://localhost:${serverPort}`,
    /** Canonical desktop, tablet, and mobile viewport definitions. */
    viewports: browserViewports,
    /** Stable matrix order used in reports, prompts, and comparisons. */
    viewportNames: ["desktop", "tablet", "mobile"] as const,
    /** Maximum wait for required images to finish loading, in milliseconds. */
    imageLoadTimeoutMs: 20_000,
    /** Maximum readiness checks before pending images become externally blocked. */
    maxImageReadinessAttempts: 2,
    /** Maximum browser issues included in model-facing diagnostics. */
    maxModelBrowserIssues: 10,
    /** Maximum runtime errors included in model-facing diagnostics. */
    maxModelRuntimeErrors: 10,
    /** Maximum page navigation duration, in milliseconds. */
    navigationTimeoutMs: 30_000,
    /** Maximum time to create and initialize a browser page, in milliseconds. */
    pageCreationTimeoutMs: 30_000,
    /** Maximum polling attempts while waiting for the artifact render-ready signal. */
    renderReadyMaxAttempts: 8,
    /** Delay between render-ready polls, in milliseconds. */
    renderReadyPollIntervalMs: 250,
    /** Chrome DevTools MCP process and client settings. */
    devtools: {
      /** Enables browser inspection through Chrome DevTools MCP. */
      enabled: true,
      /** Absolute path to the Chrome DevTools MCP executable. */
      command: join(appDir, "../node_modules/.bin/chrome-devtools-mcp"),
      /** Complete argument override; undefined uses defaultArgs. */
      args: undefined as readonly string[] | undefined,
      /** Default isolated headless arguments passed to Chrome DevTools MCP. */
      defaultArgs: ["--headless", "--isolated", "--no-usage-statistics"],
      /** Reuses the discovered MCP tool list for later client sessions. */
      cacheToolsList: true,
      /** Maximum idle client-session duration, in seconds. */
      clientSessionTimeoutSeconds: 90,
      /** Maximum duration of one DevTools tool call, in milliseconds. */
      toolTimeoutMs: 45_000,
    },
  },
  /** Responsive values shared by generated artifacts and the editor. */
  responsive: {
    // Keep these values aligned with the Tailwind --breakpoint-* theme used by
    // generated artifacts. The editor uses their exact values for container
    // queries instead of Tailwind's different default container breakpoints.
    /** Tailwind viewport breakpoint values used for responsive layout rules. */
    breakpoints: {
      /** Small-screen lower bound. */
      sm: "640px",
      /** Medium-screen lower bound. */
      md: "768px",
      /** Large-screen lower bound. */
      lg: "1024px",
      /** Extra-large-screen lower bound. */
      xl: "1280px",
      /** Double-extra-large-screen lower bound. */
      "2xl": "1536px",
    } satisfies ResponsiveBreakpoints,
  },
  /** Component-library allowlists exposed to artifact generation. */
  components: {
    /** Components the Designer may use as direct page-building primitives. */
    buildingComponents: [
      "Accordion",
      "Button",
      "Card",
      "Carousel",
      "Contact",
      "Divider",
      "Icon",
      "Image",
      "Navbar",
      "Social",
      "Tabs",
      "Text",
    ],
  },
} as const;
