import assert from "node:assert/strict";
import test from "node:test";

import {
  readDesignSystemReference,
  resolveDesignSystemReference,
} from "../app/designSystemReference.ts";

test("treats -1 as no selected design system", async () => {
  assert.equal(await resolveDesignSystemReference(-1), undefined);
});

test("resolves a known design system to its DESIGN.md", async () => {
  const reference = await resolveDesignSystemReference(1);
  assert.equal(reference?.id, 1);
  assert.equal(reference?.title, "Airbnb");
  assert.match(reference?.sourceDir ?? "", /design-system\/airbnb$/);
  assert.match(reference?.documentPath ?? "", /design-system\/airbnb\/DESIGN\.md$/);
  assert.ok((await readDesignSystemReference(reference!)).length > 0);
});

test("rejects an unknown design system id", async () => {
  await assert.rejects(
    () => resolveDesignSystemReference(999),
    /design_system_not_found:999/,
  );
});
