export type FixedGridGeometryInput = {
  height: number;
  rows: number;
  rowGap: number;
  paddingTop?: number;
  paddingBottom?: number;
  borderTop?: number;
  borderBottom?: number;
  boxSizing?: "border-box" | "content-box";
};

export type FixedGridGeometry = {
  contentHeight: number;
  trackSize: number;
  verticalInsets: number;
};

export type GridAreaGeometry = {
  span: number;
  height: number;
};

/**
 * Mirrors the fixed-row calculation in React's Section component.
 *
 * Section observes the element's content box, removes row gaps, divides the
 * remaining space evenly, and floors each track to a whole CSS pixel.
 */
export function calculateFixedGridGeometry({
  height,
  rows,
  rowGap,
  paddingTop = 0,
  paddingBottom = 0,
  borderTop = 0,
  borderBottom = 0,
  boxSizing = "border-box",
}: FixedGridGeometryInput): FixedGridGeometry {
  const verticalInsets =
    boxSizing === "border-box"
      ? paddingTop + paddingBottom + borderTop + borderBottom
      : 0;
  const contentHeight = Math.max(0, height - verticalInsets);
  const availableTrackSpace = Math.max(
    0,
    contentHeight - Math.max(0, rows - 1) * rowGap,
  );

  return {
    contentHeight,
    trackSize: rows > 0 ? Math.floor(availableTrackSpace / rows) : 0,
    verticalInsets,
  };
}

export function calculateGridAreaGeometry(
  span: number,
  trackSize: number,
  rowGap: number,
): GridAreaGeometry {
  const normalizedSpan = Math.max(1, Math.floor(span));
  return {
    span: normalizedSpan,
    height:
      normalizedSpan * Math.max(0, trackSize) +
      Math.max(0, normalizedSpan - 1) * Math.max(0, rowGap),
  };
}

export function calculateRequiredRowSpan(
  requiredHeight: number,
  trackSize: number,
  rowGap: number,
) {
  const unit = Math.max(0, trackSize) + Math.max(0, rowGap);
  if (unit <= 0) return 1;
  return Math.max(
    1,
    Math.ceil((Math.max(0, requiredHeight) + Math.max(0, rowGap)) / unit),
  );
}

export function calculateBorderBoxHeightForTrackSize({
  rows,
  rowGap,
  trackSize,
  verticalInsets = 0,
}: {
  rows: number;
  rowGap: number;
  trackSize: number;
  verticalInsets?: number;
}) {
  const normalizedRows = Math.max(1, Math.floor(rows));
  return Math.ceil(
    Math.max(0, verticalInsets) +
      normalizedRows * Math.max(0, trackSize) +
      Math.max(0, normalizedRows - 1) * Math.max(0, rowGap),
  );
}
