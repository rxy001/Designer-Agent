import assert from "node:assert/strict";
import test from "node:test";

import { getUserPrompt } from "../app/prompts/user.ts";

test("keeps the user request authoritative without inlining JSX", () => {
  const prompt = getUserPrompt({
    operation: "modify",
    userPrompt: "Build exactly what I asked for",
  });
  assert.match(prompt, /^User request — highest authority:/);
  assert.match(prompt, /Build exactly what I asked for/);
  assert.match(prompt, /\/workspace\/output\/current-artifact\.jsx/);
  assert.doesNotMatch(prompt, /```jsx/);
  assert.match(prompt, /No design system was selected/);
  assert.doesNotMatch(prompt, /\/workspace\/design-system/);
});

test("points selected design-system runs at the read-only reference", () => {
  const prompt = getUserPrompt({
    operation: "create",
    userPrompt: "Create a dashboard",
    designSystem: { id: 2, title: "Airtable" },
  });
  assert.match(prompt, /Airtable/);
  assert.match(prompt, /\/workspace\/design-system\/DESIGN\.md/);
  assert.match(prompt, /subordinate to the user request/);
});

test("describes the selected Section as the modification boundary", () => {
  const prompt = getUserPrompt({
    operation: "modify",
    userPrompt: "Add a call to action",
    targetSectionId: "hero",
  });

  assert.match(prompt, /Revise only the selected Section \(hero\)/);
  assert.match(prompt, /add new tools inside it/);
  assert.match(prompt, /cross-Section Tool moves/);
});

test("keeps selected Tool edits inside its existing Section structure", () => {
  const prompt = getUserPrompt({
    operation: "modify",
    userPrompt: "Improve the heading",
    targetToolId: "headline",
  });

  assert.match(prompt, /Do not add tools/);
  assert.match(prompt, /remove sibling tools/);
  assert.match(prompt, /move any tool across Sections/);
  assert.match(prompt, /remove the selected Tool when explicitly requested/);
});
