import express from "express";
import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  closeBrowserVerificationRuntime,
  repairBrowserArtifact,
  type BrowserVerificationViewport,
} from "./agent.ts";
import { paths } from "./paths.ts";
import {
  getPreviewArtifact,
  registerPreviewArtifact,
  unregisterPreviewArtifact,
} from "./previewRegistry.ts";
import {
  closePreviewRenderer,
  installPreviewRenderer,
  renderPreviewHtml,
} from "./previewRenderer.ts";

const viewportNames = ["desktop", "tablet", "mobile"] as const;
const fixtureDirectory = join(
  paths.appDir,
  "../fixtures/automatic-grid-repair",
);

export type AutomaticGridRepairDevOptions = {
  path?: string;
  fixture?: string;
  viewports?: BrowserVerificationViewport[];
  outputDirectory: string;
  help: boolean;
};

export function parseAutomaticGridRepairDevArgs(
  argv: string[],
): AutomaticGridRepairDevOptions {
  let path: string | undefined;
  let fixture: AutomaticGridRepairDevOptions["fixture"];
  let viewports: BrowserVerificationViewport[] | undefined;
  let outputDirectory = join(
    paths.appDir,
    "../.vite-preview-cache/auto-repair-dev/latest",
  );
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument === "--path") {
      path = readOptionValue(argv, ++index, argument);
      continue;
    }
    if (argument === "--fixture") {
      const value = readOptionValue(argv, ++index, argument);
      const fixtures = discoverAutomaticGridRepairFixtures();
      if (!fixtures.some((fixture) => fixture.name === value)) {
        throw new Error(
          `Unknown fixture: ${value}. Available fixtures: ${fixtures.map((fixture) => fixture.name).join(", ") || "none"}`,
        );
      }
      fixture = value;
      continue;
    }
    if (argument === "--viewports") {
      const requested = readOptionValue(argv, ++index, argument)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const invalid = requested.filter(
        (value) =>
          !viewportNames.includes(value as BrowserVerificationViewport),
      );
      if (invalid.length > 0) {
        throw new Error(`Invalid viewport(s): ${invalid.join(", ")}`);
      }
      viewports = [...new Set(requested)] as BrowserVerificationViewport[];
      if (viewports.length === 0) {
        throw new Error("--viewports must include at least one viewport.");
      }
      continue;
    }
    if (argument === "--output") {
      outputDirectory = resolve(readOptionValue(argv, ++index, argument));
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!help && Boolean(path) === Boolean(fixture)) {
    throw new Error("Provide exactly one of --path or --fixture.");
  }

  return { path, fixture, viewports, outputDirectory, help };
}

export function automaticGridRepairDevUsage() {
  const fixtureNames = discoverAutomaticGridRepairFixtures().map(
    (fixture) => fixture.name,
  );
  return [
    "Usage:",
    "  npm run dev:auto-repair -- --path /workspace/output/page.jsx [--viewports mobile] [--output directory]",
    "  npm run dev:auto-repair -- --fixture in-place-span-overflow [--viewports mobile]",
    "",
    "Runs a real-browser repair against an isolated copy and writes an HTML decision report.",
    "The source JSX is never modified.",
    `Available fixtures: ${fixtureNames.join(", ") || "none"}`,
  ].join("\n");
}

export function discoverAutomaticGridRepairFixtures(
  directory = fixtureDirectory,
) {
  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() && /\.(?:jsx|tsx)$/.test(entry.name),
      )
      .map((entry) => ({
        name: entry.name.replace(/\.(?:jsx|tsx)$/, ""),
        fileName: entry.name,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return [];
  }
}

export async function runAutomaticGridRepairDevCli(
  argv = process.argv.slice(2),
) {
  let options: AutomaticGridRepairDevOptions;
  try {
    options = parseAutomaticGridRepairDevArgs(argv);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n\n`,
    );
    process.stderr.write(`${automaticGridRepairDevUsage()}\n`);
    return 2;
  }

  if (options.help) {
    process.stdout.write(`${automaticGridRepairDevUsage()}\n`);
    return 0;
  }

  const sourcePath = options.fixture
    ? join(
        fixtureDirectory,
        discoverAutomaticGridRepairFixtures().find(
          (fixture) => fixture.name === options.fixture,
        )!.fileName,
      )
    : (await registerPreviewArtifact(options.path!, paths.workspaceDir))
        .hostPath;
  const originalSource = await readFile(sourcePath, "utf8");
  const runKey = createAutomaticGridRepairDevRunKey({
    source: originalSource,
    viewports: options.viewports,
  });
  const workingFileName = `.auto-repair-dev-${runKey}-${process.pid}-${Date.now()}.jsx`;
  const workingHostPath = join(paths.workspaceDir, workingFileName);
  const workingSandboxPath = `/workspace/output/${workingFileName}`;
  await writeFile(workingHostPath, originalSource, "utf8");

  const app = express();
  app.use((_request, response, next) => {
    response.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0",
    );
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Expires", "0");
    next();
  });
  app.get("/preview-artifacts/:id", async (request, response) => {
    try {
      const artifact = getPreviewArtifact(request.params.id);
      if (!artifact) {
        response.status(404).send("Preview artifact not found.");
        return;
      }
      response.type("html").send(await renderPreviewHtml(artifact.id));
    } catch (error) {
      response
        .status(500)
        .send(error instanceof Error ? error.message : String(error));
    }
  });

  let server: Server | undefined;
  try {
    await installPreviewRenderer(app);
    server = await listenOnEphemeralPort(app);
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Unable to determine preview server port.");
    }
    const result = await repairBrowserArtifact({
      path: workingSandboxPath,
      viewports: options.viewports,
      captureScreenshots: true,
      previewBaseUrl: `http://127.0.0.1:${address.port}`,
    });
    const repairedSource = await readFile(workingHostPath, "utf8");
    const reportPath = await writeDevelopmentReport({
      outputDirectory: options.outputDirectory,
      sourceLabel: options.fixture ?? options.path!,
      originalSource,
      repairedSource,
      result,
      runKey,
    });
    process.stdout.write(
      [
        `Automatic repair status: ${result.status}`,
        `Input run key: ${runKey}`,
        `Source unchanged: ${sourcePath}`,
        `Development report: ${reportPath}`,
      ].join("\n") + "\n",
    );
    return result.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(
      `Automatic repair development run failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 2;
  } finally {
    await closeBrowserVerificationRuntime();
    await closeServer(server);
    await closePreviewRenderer();
    unregisterPreviewArtifact(workingSandboxPath);
    await unlinkIfPresent(workingHostPath);
  }
}

export function createAutomaticGridRepairDevRunKey({
  source,
  viewports,
}: {
  source: string;
  viewports?: readonly BrowserVerificationViewport[];
}) {
  const viewportKey = viewports?.length
    ? [...new Set(viewports)].sort().join(",")
    : "desktop,mobile,tablet";
  return createHash("sha256")
    .update("automatic-grid-repair-dev:v1\0")
    .update(viewportKey)
    .update("\0")
    .update(source)
    .digest("hex")
    .slice(0, 16);
}

async function writeDevelopmentReport({
  outputDirectory,
  sourceLabel,
  originalSource,
  repairedSource,
  result,
  runKey,
}: {
  outputDirectory: string;
  sourceLabel: string;
  originalSource: string;
  repairedSource: string;
  result: Awaited<ReturnType<typeof repairBrowserArtifact>>;
  runKey: string;
}) {
  await mkdir(outputDirectory, { recursive: true });
  const decisions = "decisions" in result ? (result.decisions ?? []) : [];
  const screenshotViewport = selectDevelopmentReportViewport({
    decisions,
    applied: result.applied,
    beforeInspection:
      "beforeInspection" in result ? result.beforeInspection : undefined,
  });
  const beforeScreenshot = getScreenshot(
    result,
    "beforeInspection",
    screenshotViewport,
  );
  const afterScreenshot = getScreenshot(
    result,
    "afterInspection",
    screenshotViewport,
  );
  const beforeScreenshotName = beforeScreenshot
    ? `before-${runKey}.jpg`
    : undefined;
  const afterScreenshotName = afterScreenshot
    ? `after-${runKey}.jpg`
    : undefined;
  const reportJson = JSON.stringify(
    { ...result, developmentRun: { runKey } },
    (key, value) =>
      key === "screenshotDataUrl" && typeof value === "string"
        ? "[saved as image]"
        : value,
    2,
  );
  const diff = buildLineDiff(originalSource, repairedSource);
  const html = renderDevelopmentReportHtml({
    sourceLabel,
    status: result.status,
    ok: result.ok,
    originalSource,
    repairedSource,
    diff,
    decisions,
    screenshotViewport,
    beforeScreenshotName,
    afterScreenshotName,
    runKey,
  });

  await Promise.all([
    writeFile(join(outputDirectory, "original.jsx"), originalSource, "utf8"),
    writeFile(join(outputDirectory, "repaired.jsx"), repairedSource, "utf8"),
    writeFile(join(outputDirectory, "report.json"), `${reportJson}\n`, "utf8"),
    writeFile(join(outputDirectory, "index.html"), html, "utf8"),
    ...(beforeScreenshot
      ? [
          writeFile(
            join(outputDirectory, beforeScreenshotName!),
            beforeScreenshot,
          ),
        ]
      : []),
    ...(afterScreenshot
      ? [
          writeFile(
            join(outputDirectory, afterScreenshotName!),
            afterScreenshot,
          ),
        ]
      : []),
  ]);

  return join(outputDirectory, "index.html");
}

export function renderDevelopmentReportHtml({
  sourceLabel,
  status,
  ok,
  originalSource,
  repairedSource,
  diff,
  decisions,
  screenshotViewport,
  beforeScreenshotName,
  afterScreenshotName,
  runKey,
}: {
  sourceLabel: string;
  status: string;
  ok: boolean;
  originalSource: string;
  repairedSource: string;
  diff: string;
  decisions: unknown[];
  screenshotViewport?: BrowserVerificationViewport;
  beforeScreenshotName?: string;
  afterScreenshotName?: string;
  runKey?: string;
}) {
  const decisionRows = decisions
    .map((decision, index) => {
      const record = decision as Record<string, unknown>;
      return `<tr><td>${index + 1}</td><td>${escapeHtml(String(record.type ?? ""))}</td><td><code>${escapeHtml(String(record.kind ?? "—"))}</code></td><td>${escapeHtml(String(record.candidateId ?? "—"))}</td><td>${escapeHtml(formatDecisionResult(record))}</td></tr>`;
    })
    .join("");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <title>自动修复开发报告</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; background: #f5f5f4; color: #1c1917; }
    body { margin: 0; padding: 32px; }
    main { max-width: 1500px; margin: auto; }
    h1, h2 { letter-spacing: -0.025em; }
    .summary, section { background: white; border: 1px solid #d6d3d1; border-radius: 14px; padding: 20px; margin: 18px 0; }
    .status { display: inline-block; padding: 5px 10px; border-radius: 999px; background: ${ok ? "#dcfce7" : "#fee2e2"}; color: ${ok ? "#166534" : "#991b1b"}; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    img { width: 100%; border: 1px solid #d6d3d1; border-radius: 10px; background: white; }
    pre { margin: 0; padding: 16px; overflow: auto; max-height: 620px; border-radius: 10px; background: #1c1917; color: #fafaf9; font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    @media (max-width: 900px) { body { padding: 16px; } .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body><main>
  <h1>自动修复开发报告</h1>
  <div class="summary"><span class="status">${escapeHtml(status)}</span><p>输入：<code>${escapeHtml(sourceLabel)}</code></p>${runKey ? `<p>本次内容指纹：<code>${escapeHtml(runKey)}</code></p>` : ""}<p>在隔离副本上运行，原始 JSX 未被修改。</p></div>
  <section><h2>修复决策</h2><table><thead><tr><th>#</th><th>事件</th><th>候选类型</th><th>候选 ID</th><th>结果</th></tr></thead><tbody>${decisionRows || '<tr><td colspan="5">没有生成候选</td></tr>'}</tbody></table></section>
  <section><h2>浏览器截图${screenshotViewport ? `（${escapeHtml(screenshotViewport)}）` : ""}</h2><div class="grid"><div><h3>修复前${screenshotViewport ? ` · ${escapeHtml(screenshotViewport)}` : ""}</h3>${renderImage(beforeScreenshotName)}</div><div><h3>修复后${screenshotViewport ? ` · ${escapeHtml(screenshotViewport)}` : ""}</h3>${renderImage(afterScreenshotName)}</div></div></section>
  <section><h2>JSX Diff</h2><pre>${escapeHtml(diff || "No source changes.")}</pre></section>
  <section><h2>完整 JSX</h2><div class="grid"><div><h3>真实输入</h3><pre>${escapeHtml(originalSource)}</pre></div><div><h3>修复结果</h3><pre>${escapeHtml(repairedSource)}</pre></div></div></section>
</main></body></html>`;
}

function formatDecisionResult(record: Record<string, unknown>) {
  if (record.type === "candidate_verify") {
    return `cost=${record.estimatedCost ?? "?"}`;
  }
  if (record.type === "candidate_verified") {
    return `ok=${record.ok}; blockers=${record.blockingIssueCount ?? "?"}`;
  }
  if (record.type === "candidate_committed") {
    return `selected; remaining blockers=${record.remainingBlockerCount ?? "?"}`;
  }
  if (record.type === "no_safe_candidate") {
    return String(record.status ?? "no safe candidate");
  }
  return "";
}

function renderImage(fileName: string | undefined) {
  return fileName
    ? `<img src="${escapeHtml(fileName)}" alt="自动修复截图" />`
    : "<p>未生成截图。</p>";
}

function getScreenshot(
  result: Awaited<ReturnType<typeof repairBrowserArtifact>>,
  key: "beforeInspection" | "afterInspection",
  preferredViewport?: BrowserVerificationViewport,
) {
  if (!(key in result)) return undefined;
  const inspection = result[key];
  if (!inspection) return undefined;
  const report = preferredViewport
    ? inspection.viewports[preferredViewport]
    : viewportNames
        .map((viewport) => inspection.viewports[viewport])
        .find((value) => value?.screenshotDataUrl);
  const dataUrl = report?.screenshotDataUrl;
  if (!dataUrl) return undefined;
  const match = /^data:image\/(?:jpeg|jpg);base64,(.+)$/.exec(dataUrl);
  return match?.[1] ? Buffer.from(match[1], "base64") : undefined;
}

export function selectDevelopmentReportViewport({
  decisions,
  applied,
  beforeInspection,
}: {
  decisions: unknown[];
  applied: Array<{ viewport: string }>;
  beforeInspection?: {
    viewports: Partial<
      Record<
        BrowserVerificationViewport,
        {
          layout?: { ok: boolean };
          runtime?: { ok: boolean };
          screenshotDataUrl?: string;
        }
      >
    >;
  };
}): BrowserVerificationViewport | undefined {
  const committedViewport = decisions
    .map((decision) => decision as Record<string, unknown>)
    .find(
      (decision) =>
        decision.type === "candidate_committed" &&
        isViewportName(decision.viewport),
    )?.viewport;
  if (isViewportName(committedViewport)) return committedViewport;

  const appliedViewport = applied.find((repair) =>
    isViewportName(repair.viewport),
  )?.viewport;
  if (isViewportName(appliedViewport)) return appliedViewport;

  const failedViewport = viewportNames.find((viewport) => {
    const report = beforeInspection?.viewports[viewport];
    return (
      report && (report.layout?.ok === false || report.runtime?.ok === false)
    );
  });
  if (failedViewport) return failedViewport;

  return viewportNames.find(
    (viewport) => beforeInspection?.viewports[viewport]?.screenshotDataUrl,
  );
}

function isViewportName(value: unknown): value is BrowserVerificationViewport {
  return viewportNames.includes(value as BrowserVerificationViewport);
}

export function buildLineDiff(before: string, after: string) {
  if (before === after) return "";
  const left = before.split("\n");
  const right = after.split("\n");
  const lengths = Array.from(
    { length: left.length + 1 },
    () => new Uint32Array(right.length + 1),
  );
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      lengths[i]![j] =
        left[i] === right[j]
          ? lengths[i + 1]![j + 1]! + 1
          : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!);
    }
  }
  const output = ["--- original.jsx", "+++ repaired.jsx"];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      output.push(`  ${left[i]}`);
      i += 1;
      j += 1;
    } else if (
      j < right.length &&
      (i === left.length || lengths[i]![j + 1]! >= lengths[i + 1]![j]!)
    ) {
      output.push(`+ ${right[j]}`);
      j += 1;
    } else {
      output.push(`- ${left[i]}`);
      i += 1;
    }
  }
  return output.join("\n");
}

function readOptionValue(argv: string[], index: number, option: string) {
  const value = argv[index]?.trim();
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function listenOnEphemeralPort(app: express.Express) {
  return new Promise<Server>((resolve, reject) => {
    const server = createServer(app);
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function closeServer(server: Server | undefined) {
  if (!server) return Promise.resolve();
  return new Promise<void>((resolve) => server.close(() => resolve()));
}

async function unlinkIfPresent(path: string) {
  try {
    await unlink(path);
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
}

const mainPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === mainPath) {
  process.exitCode = await runAutomaticGridRepairDevCli();
}
