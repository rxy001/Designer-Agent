import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type AgentLimits = {
  maxTurns: number;
  /** Maximum repair-verification calls before the first review and per failed-review repair cycle. */
  maxRepairRequests: number;
  maxFinalVisualRuns: number;
  maxAcceptanceRecoveries: number;
};

export type BrowserViewportName = "desktop" | "tablet" | "mobile";

export type BrowserViewportConfig = {
  name: BrowserViewportName;
  width: number;
  height: number;
  emulateViewport?: string;
};

const appDir = dirname(fileURLToPath(import.meta.url));
const serverPort = 3333;
const paths = {
  appDir,
  skillDir: join(appDir, "../skills"),
  componentsDir: join(appDir, "../components"),
  workspaceDir: join(appDir, "../workspace"),
  logsDir: join(appDir, "../.logs"),
  tmpDir: join(appDir, "../.tmp"),
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

export const agentConfig = {
  identity: {
    name: "Designer",
  },
  paths,
  server: {
    port: serverPort,
    workspaceFilesRoute: "/workspace",
  },
  model: {
    // Keep the secret outside source control; all non-secret model settings
    // are configured directly in this file.
    apiKey: process.env.OPEN_AI_KEY,
    baseURL: undefined,
    proxyURL: "http://127.0.0.1:7897",
    requestTimeoutMs: 15 * 60 * 1_000,
    designerModel: "gpt-5.4",
    reviewerModel: "gpt-5.4",
    storeResponses: false,
  },
  limits: {
    maxTurns: 80,
    maxRepairRequests: 10,
    maxFinalVisualRuns: 2,
    maxAcceptanceRecoveries: 1,
  } satisfies AgentLimits,
  review: {
    reviewerCritiqueEnabled: true,
  },
  logging: {
    runnerLogFile: join(paths.logsDir, "runner.log"),
    evaluationEvidenceDir: undefined as string | undefined,
  },
  sandbox: {
    root: "/workspace",
  },
  browser: {
    previewBaseURL: `http://localhost:${serverPort}`,
    viewports: browserViewports,
    viewportNames: ["desktop", "tablet", "mobile"] as const,
    imageLoadTimeoutMs: 60_000,
    maxImageReadinessAttempts: 2,
    maxModelBrowserIssues: 10,
    maxModelRuntimeErrors: 10,
    navigationTimeoutMs: 30_000,
    pageCreationTimeoutMs: 30_000,
    renderReadyMaxAttempts: 8,
    renderReadyPollIntervalMs: 250,
    devtools: {
      enabled: true,
      command: join(appDir, "../node_modules/.bin/chrome-devtools-mcp"),
      args: undefined as readonly string[] | undefined,
      defaultArgs: ["--headless", "--isolated", "--no-usage-statistics"],
      cacheToolsList: true,
      clientSessionTimeoutSeconds: 60,
      toolTimeoutMs: 60_000,
    },
  },
  components: {
    buildingComponents: [
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
    ],
  },
} as const;
