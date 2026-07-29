import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEscapedNewlinesInJsxAttributes } from "../app/previewRenderer.ts";

test("normalizes escaped newlines in quoted JSX attributes", () => {
  const source = '<Text content="客服\\n订单追踪\\r\\n保养说明" title="Footer" />';

  assert.equal(
    normalizeEscapedNewlinesInJsxAttributes(source),
    '<Text content={"客服\\n订单追踪\\n保养说明"} title="Footer" />',
  );
});

test("leaves ordinary quoted JSX attributes unchanged", () => {
  const source = '<Text content="客服与售后" title="Footer" />';

  assert.equal(normalizeEscapedNewlinesInJsxAttributes(source), source);
});
