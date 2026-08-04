import assert from "node:assert/strict";
import test from "node:test";

import { getUserPrompt } from "../app/prompts/user.ts";

test("describes the selected Section as the modification boundary", () => {
  const prompt = getUserPrompt({
    operation: "modify",
    userPrompt: "Add a call to action",
    targetSectionId: "hero",
    currentJsx: "<Root />",
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
    currentJsx: "<Root />",
  });

  assert.match(prompt, /Do not add tools/);
  assert.match(prompt, /remove sibling tools/);
  assert.match(prompt, /move any tool across Sections/);
  assert.match(prompt, /remove the selected Tool when explicitly requested/);
});
