import assert from "node:assert/strict";
import test from "node:test";

import { inspectViewportRelativeFontSizing } from "../app/artifactStylePolicy.ts";
import { getSystemPrompt } from "../app/prompts/system.ts";

test("rejects viewport-relative units in arbitrary Tailwind font sizes", () => {
  for (const className of [
    "text-[clamp(42px,5vw,76px)]",
    "max-sm:text-[8vh]",
    "text-[clamp(2rem,4vmin,5rem)]",
    "text-[3dvw]",
    "text-[3svh]",
    "text-[3lvmax]",
  ]) {
    assert.deepEqual(
      inspectViewportRelativeFontSizing(
        `<Text className="${className}" content="Title" />`,
      ).map((issue) => issue.code),
      ["viewport_relative_font_size"],
      className,
    );
  }
});

test("allows fixed responsive font sizes and non-viewport clamp values", () => {
  const source = `
    <Text
      className="text-[76px] sm:max-lg:text-[56px] max-sm:text-[42px]"
      content="Title"
    />
    <Text className="text-[clamp(42px,4rem,76px)]" content="Subtitle" />
  `;

  assert.deepEqual(inspectViewportRelativeFontSizing(source), []);
});

test("does not reject viewport units used by non-font-size utilities", () => {
  const source = `<Image className="w-[50vw] min-h-[20vh]" />`;

  assert.deepEqual(inspectViewportRelativeFontSizing(source), []);
});

test("instructs the Designer Agent to use breakpoint-specific font sizes", () => {
  const prompt = getSystemPrompt({ reviewerCritiqueEnabled: true });

  assert.match(prompt, /Font sizes must not use viewport-relative units/);
  assert.match(
    prompt,
    /text-\[76px\] sm:max-lg:text-\[56px\] max-sm:text-\[42px\]/,
  );
});
