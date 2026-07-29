import assert from "node:assert/strict";
import test from "node:test";

import {
  isBlockingOverlapRecord,
  isExpectedCarouselInternalHorizontalIssue,
} from "../app/layoutInspectionPolicy.ts";

test("ignores expected horizontal overflow on a carousel track", () => {
  assert.equal(
    isExpectedCarouselInternalHorizontalIssue(
      { dataSlot: "carousel-content" },
      "text-overflow-x",
    ),
    true,
  );
});

test("ignores expected horizontal overflow on carousel descendants", () => {
  assert.equal(
    isExpectedCarouselInternalHorizontalIssue(
      { dataSlot: "text", ancestorSlots: ["carousel-item", "carousel"] },
      "outside-viewport-x",
    ),
    true,
  );
});

test("does not hide genuine overflow on the carousel root", () => {
  assert.equal(
    isExpectedCarouselInternalHorizontalIssue(
      { dataSlot: "carousel" },
      "outside-viewport-x",
    ),
    false,
  );
});

test("does not hide non-carousel or vertical layout issues", () => {
  assert.equal(
    isExpectedCarouselInternalHorizontalIssue(
      { dataSlot: "text", ancestorSlots: ["section"] },
      "text-overflow-x",
    ),
    false,
  );
  assert.equal(
    isExpectedCarouselInternalHorizontalIssue(
      { dataSlot: "carousel-content" },
      "text-overflow-y",
    ),
    false,
  );
});

test("blocks an external Text overlapping a Carousel descendant", () => {
  assert.equal(
    isBlockingOverlapRecord({
      aDataSlot: "text",
      aToolId: "hero-kicker",
      bDataSlot: "carousel-item-title",
      bToolId: "hero-carousel",
      bAncestorSlots: ["carousel-item", "carousel-content", "carousel"],
      bCarouselRootIndex: 12,
    }),
    true,
  );
});

test("ignores Carousel background slots and same-Carousel internal overlap", () => {
  for (const backgroundSlot of [
    "carousel",
    "carousel-content",
    "carousel-item",
    "carousel-item-img",
  ]) {
    assert.equal(
      isBlockingOverlapRecord({
        aDataSlot: "text",
        bDataSlot: backgroundSlot,
      }),
      false,
      backgroundSlot,
    );
  }
  assert.equal(
    isBlockingOverlapRecord({
      aDataSlot: "carousel-item-title",
      bDataSlot: "carousel-item-description",
      aCarouselRootIndex: 12,
      bCarouselRootIndex: 12,
    }),
    false,
  );
});

test("does not merge the overlap exemption across different Carousels", () => {
  assert.equal(
    isBlockingOverlapRecord({
      aDataSlot: "carousel-item-title",
      bDataSlot: "carousel-item-title",
      aCarouselRootIndex: 12,
      bCarouselRootIndex: 24,
    }),
    true,
  );
});
