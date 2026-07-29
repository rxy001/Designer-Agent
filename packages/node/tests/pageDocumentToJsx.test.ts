import assert from "node:assert/strict";
import test from "node:test";

import { jsxToPageDocument } from "../app/editor/jsxToPageDocument.ts";
import { pageDocumentToJsx } from "../app/editor/pageDocumentToJsx.ts";
import type { PageDocument } from "../app/editor/schema.ts";

test("serializes multiline string props as JSX expressions", () => {
  const page: PageDocument = {
    id: "page-1",
    title: "Test Page",
    version: 1,
    viewport: "desktop",
    sections: [
      {
        id: "section-1",
        type: "section",
        name: "Section 1",
        grid: {
          columns: 4,
          rows: 4,
          height: 400,
          columnGap: 16,
          rowGap: 16,
        },
        tools: [
          {
            id: "text-1",
            type: "text",
            name: "Text",
            layout: {
              gridArea: {
                rowStart: 1,
                rowEnd: 3,
                columnStart: 1,
                columnEnd: 3,
              },
              zIndex: 1,
            },
            props: {
              content: "客服｜400-800-2024\n订单追踪\n保养与护理说明",
              className: "whitespace-pre-wrap text-sm",
            },
          },
        ],
      },
    ],
  };

  const jsx = pageDocumentToJsx(page);

  assert.match(
    jsx,
    /content=\{"客服｜400-800-2024\\n订单追踪\\n保养与护理说明"\}/,
  );

  const parsed = jsxToPageDocument(jsx, { previousPage: page });
  assert.equal(
    parsed.sections[0]?.tools[0]?.props.content,
    "客服｜400-800-2024\n订单追踪\n保养与护理说明",
  );
});
