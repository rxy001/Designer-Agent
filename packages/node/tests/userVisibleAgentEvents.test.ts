import assert from "node:assert/strict";
import test from "node:test";

import {
  emitUserVisibleMessage,
  sanitizeUserVisibleText,
  sanitizeUserVisibleTodos,
} from "../app/userVisibleAgentEvents.ts";

test("emits normal model text only as a user-visible message", () => {
  const events: Array<{ type: string; text?: string }> = [];

  const text = emitUserVisibleMessage(
    "已确认页面结构，正在完善内容。",
    (event) => events.push(event),
  );

  assert.equal(text, "已确认页面结构，正在完善内容。");
  assert.deepEqual(events, [
    { type: "message", text: "已确认页面结构，正在完善内容。" },
  ]);
});

test("removes internal directories and fenced implementation details", () => {
  const output = sanitizeUserVisibleText(
    "正在更新 /workspace/output/landing-page.jsx。\n```tsx\n<Root />\n```\n即将检查展示效果。",
  );

  assert.equal(output.includes("/workspace"), false);
  assert.equal(output.includes("<Root"), false);
  assert.match(output, /正在更新 相关内容/);
  assert.match(output, /即将检查展示效果/);
});

test("sanitizes todo names without changing their status", () => {
  assert.deepEqual(
    sanitizeUserVisibleTodos([
      {
        name: "检查 `/workspace/output/page.jsx` 的展示效果",
        status: "in_progress",
      },
    ]),
    [{ name: "检查 相关内容 的展示效果", status: "in_progress" }],
  );
});

test("removes relative directories from user-visible progress", () => {
  assert.equal(
    sanitizeUserVisibleText("已完成 app/editor/page.ts 的调整"),
    "已完成 相关内容 的调整",
  );
});
