import assert from "node:assert/strict";
import test from "node:test";

import { inspectArtifactIds } from "../app/artifactIdPolicy.ts";

const tools = new Set(["Card", "Text"]);

test("accepts globally unique static Section and Tool ids", () => {
  assert.deepEqual(
    inspectArtifactIds(
      `<Root><Section id="hero"><Card id="hero-card" /><Text id={"hero-copy"} /></Section></Root>`,
      tools,
    ),
    [],
  );
});

test("rejects missing, dynamic, empty, and duplicate artifact ids", () => {
  const issues = inspectArtifactIds(
    `<Root>
      <Section id="shared">
        <Card />
        <Text id={makeId()} />
        <Card id="" />
        <Text id="shared" />
      </Section>
    </Root>`,
    tools,
  );

  assert.deepEqual(
    issues.map((issue) => issue.code),
    [
      "tool_missing_stable_id",
      "artifact_id_not_static",
      "artifact_id_not_static",
      "duplicate_artifact_id",
    ],
  );
});
