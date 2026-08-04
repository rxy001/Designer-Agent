import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { UnixLocalSandboxClient } from "@openai/agents/sandbox/local";

import { createRunManifest } from "../app/agent.ts";

test("mounts only the isolated Artifact directory into Agent output", async () => {
  const root = await mkdtemp(join(tmpdir(), "artifact-isolation-"));
  const persistentWorkspace = join(root, "persistent");
  const isolatedWorkspace = join(root, "isolated");
  await Promise.all([
    mkdir(persistentWorkspace, { recursive: true }),
    mkdir(isolatedWorkspace, { recursive: true }),
  ]);
  await writeFile(
    join(persistentWorkspace, "unrelated-artifact.jsx"),
    "export default function Unrelated() {}\n",
    "utf8",
  );
  await writeFile(
    join(isolatedWorkspace, "current-artifact.jsx"),
    "export default function Current() {}\n",
    "utf8",
  );

  const session = await new UnixLocalSandboxClient().create({
    manifest: createRunManifest(isolatedWorkspace, persistentWorkspace),
  });

  try {
    const entries = await session.listDir({ path: "/workspace/output" });
    assert.deepEqual(
      entries.map((entry) => entry.name),
      ["current-artifact.jsx"],
    );
    assert.equal(
      await session.pathExists("/workspace/output/unrelated-artifact.jsx"),
      false,
    );
  } finally {
    await session.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("gives Create runs an empty output mount", async () => {
  const isolatedWorkspace = await mkdtemp(
    join(tmpdir(), "artifact-create-isolation-"),
  );
  const session = await new UnixLocalSandboxClient().create({
    manifest: createRunManifest(isolatedWorkspace, isolatedWorkspace),
  });

  try {
    assert.deepEqual(
      await session.listDir({ path: "/workspace/output" }),
      [],
    );
  } finally {
    await session.close();
    await rm(isolatedWorkspace, { recursive: true, force: true });
  }
});
