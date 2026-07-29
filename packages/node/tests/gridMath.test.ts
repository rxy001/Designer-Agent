import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBorderBoxHeightForTrackSize,
  calculateFixedGridGeometry,
  calculateGridAreaGeometry,
  calculateRequiredRowSpan,
} from "../app/gridMath.ts";

test("calculates Section tracks from the observed content box", () => {
  assert.deepEqual(
    calculateFixedGridGeometry({
      height: 440,
      rows: 8,
      rowGap: 12,
      paddingTop: 32,
      paddingBottom: 32,
      borderTop: 1,
      borderBottom: 1,
    }),
    {
      contentHeight: 374,
      verticalInsets: 66,
      trackSize: 36,
    },
  );
});

test("does not subtract padding from a content-box Section", () => {
  assert.deepEqual(
    calculateFixedGridGeometry({
      height: 440,
      rows: 8,
      rowGap: 12,
      paddingTop: 32,
      paddingBottom: 32,
      boxSizing: "content-box",
    }),
    {
      contentHeight: 440,
      verticalInsets: 0,
      trackSize: 44,
    },
  );
});

test("round-trips a fixed track size through a border-box height", () => {
  const height = calculateBorderBoxHeightForTrackSize({
    rows: 8,
    rowGap: 12,
    trackSize: 36,
    verticalInsets: 66,
  });
  assert.equal(height, 438);
  assert.equal(
    calculateFixedGridGeometry({
      height,
      rows: 8,
      rowGap: 12,
      paddingTop: 32,
      paddingBottom: 32,
      borderTop: 1,
      borderBottom: 1,
    }).trackSize,
    36,
  );
});

test("calculates a grid area's height and minimum required span", () => {
  assert.deepEqual(calculateGridAreaGeometry(5, 54, 12), {
    span: 5,
    height: 318,
  });
  assert.equal(calculateRequiredRowSpan(410, 54, 12), 7);
});
