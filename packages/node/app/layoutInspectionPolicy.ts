type LayoutElementRecord = Record<string, unknown>;

const carouselInternalHorizontalIssues = new Set([
  "outside-viewport-x",
  "text-overflow-x",
  "clipped-content-x",
  "tool-grid-area-overflow",
]);

const carouselOverlapBackgroundSlots = new Set([
  "carousel",
  "carousel-content",
  "carousel-item",
  "carousel-item-img",
]);

function isCarouselSlot(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value === "carousel" || value.startsWith("carousel-"))
  );
}

function isNavbarSlot(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value === "navbar" || value.startsWith("navbar-"))
  );
}

function isCarouselOverlapBackgroundSlot(value: unknown) {
  return (
    typeof value === "string" && carouselOverlapBackgroundSlots.has(value)
  );
}

/**
 * Ignore only overlaps caused by a sticky navigation layer, the Carousel root
 * acting as a background surface, or two descendants of the same Carousel.
 * An element outside a Carousel overlapping one of its descendants is a real
 * cross-Tool collision and must remain blocking.
 */
export function isBlockingOverlapRecord(record: LayoutElementRecord) {
  if (
    record.aStickyNavLayer === true ||
    record.bStickyNavLayer === true ||
    isNavbarSlot(record.aDataSlot) ||
    isNavbarSlot(record.bDataSlot)
  ) {
    return false;
  }

  if (
    isCarouselOverlapBackgroundSlot(record.aDataSlot) ||
    isCarouselOverlapBackgroundSlot(record.bDataSlot)
  ) {
    return false;
  }

  const aCarouselRootIndex = record.aCarouselRootIndex;
  const bCarouselRootIndex = record.bCarouselRootIndex;
  if (
    typeof aCarouselRootIndex === "number" &&
    typeof bCarouselRootIndex === "number" &&
    aCarouselRootIndex === bCarouselRootIndex
  ) {
    return false;
  }

  return true;
}

/**
 * Carousel tracks and their descendants are intentionally wider than the
 * visible carousel viewport. Their horizontal scroll metrics must not become
 * blockers merely because an unrelated element also makes the document wider.
 * The carousel root is deliberately excluded so genuine root overflow remains
 * visible to the layout gate.
 */
export function isExpectedCarouselInternalHorizontalIssue(
  element: LayoutElementRecord,
  issue: string,
) {
  if (!carouselInternalHorizontalIssues.has(issue)) {
    return false;
  }

  const dataSlot = element.dataSlot;
  if (dataSlot === "carousel") {
    return false;
  }

  if (isCarouselSlot(dataSlot)) {
    return true;
  }

  const ancestorSlots = element.ancestorSlots;
  return (
    Array.isArray(ancestorSlots) &&
    ancestorSlots.some((slot) => isCarouselSlot(slot))
  );
}
