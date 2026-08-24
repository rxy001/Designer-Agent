import assert from "node:assert/strict";
import test from "node:test";

import { agentConfig } from "../app/agentConfig.ts";

test("keeps all non-secret Agent settings in the central configuration", () => {
  assert.equal(agentConfig.server.port, 3333);
  assert.equal(
    agentConfig.browser.previewBaseURL,
    `http://localhost:${agentConfig.server.port}`,
  );
  assert.deepEqual(agentConfig.browser.viewportNames, [
    "desktop",
    "tablet",
    "mobile",
  ]);
  assert.equal(agentConfig.browser.viewports.length, 3);
  assert.equal(agentConfig.browser.devtools.enabled, true);
  assert.equal(agentConfig.model.designerModel, "gpt-5.6-luna");
  assert.equal(agentConfig.model.reviewerModel, "gpt-5.6-luna");
  assert.equal(agentConfig.model.baseURL, undefined);
  assert.equal(agentConfig.browser.imageLoadTimeoutMs, 20_000);
  assert.equal(agentConfig.browser.devtools.clientSessionTimeoutSeconds, 90);
  assert.equal(agentConfig.browser.devtools.toolTimeoutMs, 45_000);
  assert.match(
    agentConfig.images.placeholderSrc,
    /^data:image\/svg\+xml;charset=utf-8,/,
  );
  assert.equal(agentConfig.limits.maxFinalVisualRuns, 3);
  assert.equal(agentConfig.limits.maxAcceptanceRecoveries, 2);
  assert.equal(agentConfig.site.timeouts.shellAgentMs, 2 * 60 * 1_000);
  assert.equal(agentConfig.site.timeouts.pageAgentMs, 30 * 60 * 1_000);
  assert.equal(agentConfig.site.timeouts.reviewerMs, 5 * 60 * 1_000);
  assert.equal(agentConfig.review.maxAgentTurns, 14);
  assert.equal(agentConfig.review.maxToolCalls, 14);
  assert.equal(agentConfig.review.maxScreenshots, 10);
  assert.equal(agentConfig.review.maxResponsiveWidths, 4);
  assert.equal(agentConfig.review.maxInteractionProbes, 3);
  assert.equal(agentConfig.review.maxExecutionAttempts, 2);
  assert.equal(agentConfig.review.maxSemanticCorrectionAttempts, 1);
  assert.deepEqual(agentConfig.responsive.breakpoints, {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  });
});

test("derives related paths and URLs from file-local configuration", () => {
  assert.ok(agentConfig.paths.workspaceDir.endsWith("/workspace"));
  assert.ok(agentConfig.paths.logsDir.endsWith("/.logs"));
  assert.ok(agentConfig.paths.tmpDir.endsWith("/.tmp"));
  assert.equal(
    agentConfig.artifacts.registryFile,
    joinForAssertion(agentConfig.paths.tmpDir, "preview-artifacts.json"),
  );
  assert.equal(
    agentConfig.logging.artifactLogFile("page-123"),
    joinForAssertion(agentConfig.paths.logsDir, "page-123.log"),
  );
  assert.equal(
    agentConfig.logging.systemLogFile,
    joinForAssertion(agentConfig.paths.logsDir, "system.log"),
  );
  assert.ok(
    agentConfig.browser.devtools.command.endsWith("chrome-devtools-mcp"),
  );
});

function joinForAssertion(parent: string, child: string) {
  return `${parent}/${child}`;
}
