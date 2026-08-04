import assert from "node:assert/strict";
import test from "node:test";

import {
  getBrokenImageUrls,
  replaceBrokenImageUrls,
} from "../app/imageFallback.ts";

test("collects only stable broken image URLs", () => {
  assert.deepEqual(
    getBrokenImageUrls({
      blockingIssues: [
        {
          code: "layout_image_issue",
          image: { src: "https://example.com/broken.jpg", issues: ["broken-image"] },
        },
        {
          code: "layout_image_issue",
          image: { src: "https://example.com/pending.jpg", issues: ["pending-image"] },
        },
      ],
    }),
    ["https://example.com/broken.jpg"],
  );
});

test("replaces every matching broken URL and preserves pending URLs", () => {
  const result = replaceBrokenImageUrls(
    '<Image src="https://example.com/broken.jpg" /><Card imgSrc="https://example.com/broken.jpg" /><Image src="https://example.com/pending.jpg" />',
    ["https://example.com/broken.jpg"],
    "data:image/svg+xml,placeholder",
  );

  assert.equal(result.replacedUrls.length, 1);
  assert.doesNotMatch(result.source, /broken\.jpg/);
  assert.match(result.source, /pending\.jpg/);
  assert.equal(
    result.source.match(/data:image\/svg\+xml,placeholder/g)?.length,
    2,
  );
});
