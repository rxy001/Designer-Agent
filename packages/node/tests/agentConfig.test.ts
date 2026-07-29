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
  assert.equal(agentConfig.model.designerModel, "gpt-5.4");
  assert.equal(agentConfig.model.baseURL, undefined);
});

test("derives related paths and URLs from file-local configuration", () => {
  assert.ok(agentConfig.paths.workspaceDir.endsWith("/workspace"));
  assert.ok(agentConfig.paths.logsDir.endsWith("/.logs"));
  assert.ok(agentConfig.paths.tmpDir.endsWith("/.tmp"));
  assert.equal(
    agentConfig.logging.runnerLogFile,
    joinForAssertion(agentConfig.paths.logsDir, "runner.log"),
  );
  assert.ok(
    agentConfig.browser.devtools.command.endsWith("chrome-devtools-mcp"),
  );
});

function joinForAssertion(parent: string, child: string) {
  return `${parent}/${child}`;
}
