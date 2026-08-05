type LayoutRecord = Record<string, unknown>;

type SectionEvidence = {
  sectionIndex: number;
  sectionLayout?: LayoutRecord;
  affectedSectionIndexes: Set<number>;
  samples: LayoutRecord[];
  sampleKeys: Set<string>;
  toolIndexes: Set<number>;
  maxOverflow: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  hasOverlap: boolean;
  hasImageIssue: boolean;
  hasSectionContainment: boolean;
  hasHorizontalOverflow: boolean;
  hasVerticalOverflow: boolean;
  hasLowContrast: boolean;
  hasSuspiciousHiddenText: boolean;
  hasEmptyVisibleTool: boolean;
  hasExcessiveUnusedSpace: boolean;
};

const horizontalElementIssues = new Set([
  "outside-viewport-x",
  "text-overflow-x",
  "clipped-content-x",
]);

const verticalElementIssues = new Set([
  "outside-viewport-y",
  "text-overflow-y",
  "clipped-content-y",
]);

export function buildLayoutRepairFacts(layoutIssues: LayoutRecord[]) {
  const sections = new Map<number, SectionEvidence>();
  const unlocatedIssues: LayoutRecord[] = [];
  const environmentIssues: LayoutRecord[] = [];
  const imageReadinessIssues: LayoutRecord[] = [];
  const facts: LayoutRecord[] = [];
  let documentHorizontalOverflow: { overflowPixels: number } | undefined;

  const documentOverflowIssue = layoutIssues.find(
    (issue) => getString(issue, "code") === "layout_horizontal_overflow",
  );
  const documentViewport = getRecord(documentOverflowIssue, "viewport");
  const documentViewportWidth = getNumber(documentViewport, "width");

  for (const issue of layoutIssues) {
    const code = getString(issue, "code") ?? "unknown-layout-issue";

    if (
      code === "browser_mobile_emulation_failed" ||
      code === "browser_viewport_size_mismatch" ||
      code === "browser_viewport_size_unknown"
    ) {
      environmentIssues.push(compactUnlocatedIssue(issue));
      continue;
    }

    if (code === "browser_image_loading_timed_out") {
      const image = getRecord(issue, "image");
      imageReadinessIssues.push(compactRecord({
        code,
        dataSlot: getString(image, "dataSlot"),
        sectionId: getString(image, "sectionId"),
        toolId: getString(image, "toolId"),
        sectionIndex: getNumber(image, "sectionIndex"),
        toolIndexInSection: getNumber(image, "toolIndexInSection"),
        slotIndexInTool: getNumber(image, "slotIndexInTool"),
        src: getString(image, "src"),
        issues: getStringArray(image, "issues"),
      }));
      continue;
    }

    if (code === "layout_element_issue") {
      const element = getRecord(issue, "element");
      if (
        !element ||
        !addElementEvidence(
          sections,
          element,
          "element",
          "layout_element_issue",
          documentViewportWidth,
        )
      ) {
        unlocatedIssues.push(compactUnlocatedIssue(issue));
      }
      continue;
    }

    if (code === "layout_image_issue") {
      const image = getRecord(issue, "image");
      if (
        !image ||
        !addElementEvidence(
          sections,
          image,
          "image",
          "layout_image_issue",
          documentViewportWidth,
        )
      ) {
        unlocatedIssues.push(compactUnlocatedIssue(issue));
      }
      continue;
    }

    if (code === "layout_grid_area_containment") {
      const records = getRecordArray(issue, "gridAreaContainment");
      let located = false;

      for (const record of records) {
        const sectionIndex = getNumber(record, "sectionIndex");
        if (sectionIndex === undefined) {
          continue;
        }

        located = true;
        const evidence = getSectionEvidence(sections, sectionIndex);
        captureSectionLayout(evidence, getRecord(record, "sectionGrid"));
        const toolIndex = getNumber(record, "toolIndexInSection");
        const overflow = readOverflow(record);
        addToolIndex(evidence, toolIndex);
        evidence.hasSectionContainment ||=
          getString(record, "type") === "section";
        evidence.hasHorizontalOverflow ||=
          (getNumber(overflow, "left") ?? 0) > 0 ||
          (getNumber(overflow, "right") ?? 0) > 0;
        evidence.hasVerticalOverflow ||=
          (getNumber(overflow, "top") ?? 0) > 0 ||
          (getNumber(overflow, "bottom") ?? 0) > 0;
        mergeOverflow(evidence.maxOverflow, overflow);
        addSample(evidence, compactRecord({
          sourceCode: code,
          type: getString(record, "type") ?? "grid-area",
          issue: getString(record, "issue"),
          dataSlot: getString(record, "dataSlot"),
          sectionId: getString(record, "sectionId"),
          toolId: getString(record, "toolId"),
          sectionIndex,
          toolIndexInSection: toolIndex,
          overflow,
          gridArea: getRecord(record, "gridArea"),
          rect: getRecord(record, "containerRect"),
          text: compactText(getString(record, "text"), 80),
        }));
      }

      if (!located) {
        unlocatedIssues.push(compactUnlocatedIssue(issue));
      }
      continue;
    }

    if (code === "layout_unintended_overlap") {
      const overlaps = getRecordArray(issue, "overlaps");
      let located = false;

      for (const overlap of overlaps) {
        const aSectionIndex = getNumber(overlap, "aSectionIndex");
        const bSectionIndex = getNumber(overlap, "bSectionIndex");
        const ownerSectionIndex = chooseOverlapOwnerSection(
          aSectionIndex,
          bSectionIndex,
        );

        if (ownerSectionIndex === undefined) {
          continue;
        }

        located = true;
        const evidence = getSectionEvidence(sections, ownerSectionIndex);
        evidence.hasOverlap = true;

        if (aSectionIndex === ownerSectionIndex) {
          addToolIndex(evidence, getNumber(overlap, "aToolIndexInSection"));
        }
        if (bSectionIndex === ownerSectionIndex) {
          addToolIndex(evidence, getNumber(overlap, "bToolIndexInSection"));
        }

        const affectedSectionIndex =
          aSectionIndex === ownerSectionIndex ? bSectionIndex : aSectionIndex;
        const ownerSectionId =
          aSectionIndex === ownerSectionIndex
            ? getString(overlap, "aSectionId")
            : getString(overlap, "bSectionId");
        if (
          affectedSectionIndex !== undefined &&
          affectedSectionIndex !== ownerSectionIndex
        ) {
          evidence.affectedSectionIndexes.add(affectedSectionIndex);
        }

        addSample(evidence, compactRecord({
          sourceCode: code,
          type: "overlap",
          sectionId: ownerSectionId,
          sectionIndex: ownerSectionIndex,
          ownerSectionIndex,
          affectedSectionIndex:
            affectedSectionIndex !== ownerSectionIndex
              ? affectedSectionIndex
              : undefined,
          a: compactElementReference(overlap, "a"),
          b: compactElementReference(overlap, "b"),
          area: getNumber(overlap, "area"),
        }));
      }

      if (!located) {
        unlocatedIssues.push(compactUnlocatedIssue(issue));
      }
      continue;
    }

    if (code === "layout_horizontal_overflow") {
      const document = getRecord(issue, "document");
      const overflowPixels = positiveDifference(
        getNumber(document, "scrollWidth"),
        getNumber(document, "clientWidth"),
      ) ?? 0;
      documentHorizontalOverflow = {
        overflowPixels,
      };
      continue;
    }

    unlocatedIssues.push(compactUnlocatedIssue(issue));
  }

  if (documentHorizontalOverflow) {
    const owner = findDocumentOverflowOwner(sections);
    if (owner) {
      const identitySample = owner.samples.find(
        (sample) => getStringArray(sample, "issues").includes("outside-viewport-x"),
      ) ?? owner.samples[0];
      owner.hasHorizontalOverflow = true;
      owner.maxOverflow.right = Math.max(
        owner.maxOverflow.right,
        documentHorizontalOverflow.overflowPixels,
      );
      addSample(owner, compactRecord({
        sourceCode: "layout_horizontal_overflow",
        type: "document",
        dataSlot: "section",
        sectionId: getString(identitySample, "sectionId"),
        sectionIndex: owner.sectionIndex,
        issues: ["document-horizontal-overflow"],
        overflowRight: documentHorizontalOverflow.overflowPixels,
      }));
    } else {
      facts.push(buildUnlocatedDocumentOverflowFact(
        documentHorizontalOverflow.overflowPixels,
      ));
    }
  }

  const sectionFacts = [...sections.values()]
    .sort((left, right) => left.sectionIndex - right.sectionIndex)
    .map(buildSectionFact);

  facts.unshift(...sectionFacts);

  if (environmentIssues.length > 0) {
    facts.unshift({
      code: "browser-viewport-environment-repair",
      sourceCodes: [
        ...new Set(
          environmentIssues.flatMap((issue) =>
            getString(issue, "code") ? [getString(issue, "code")!] : [],
          ),
        ),
      ],
      severity: "environment",
      count: environmentIssues.length,
        samples: environmentIssues,
      message:
        "The requested browser viewport/device mode was not applied reliably, so layout evidence for this viewport is invalid.",
      nextActions: [
        "Do not edit JSX or CSS for this issue.",
        "Create a clean browser page, apply the requested device emulation before navigation, and verify inner, client, and visual viewport dimensions.",
        "Rerun verify_browser_matrix after browser viewport preflight passes.",
      ],
    });
  }

  if (imageReadinessIssues.length > 0) {
    facts.unshift({
      code: "browser-image-loading-retry",
      sourceCodes: ["browser_image_loading_timed_out"],
      severity: "environment",
      count: imageReadinessIssues.length,
      samples: imageReadinessIssues,
      message:
        "Relevant images did not settle before the browser readiness timeout, so this run cannot distinguish a slow external request from a persistent image failure.",
      nextActions: [
        "Do not edit JSX or CSS for a pending-image readiness timeout.",
        "Rerun verify_browser_matrix at most once for only this viewport in a clean browser page.",
        "Treat the image as an artifact defect only if a later run reports broken-image or another stable image issue.",
      ],
    });
  }

  if (unlocatedIssues.length > 0) {
    facts.push({
      code: "unlocated-layout-issue",
      sourceCodes: [
        ...new Set(
          unlocatedIssues.flatMap((issue) =>
            getString(issue, "code") ? [getString(issue, "code")!] : [],
          ),
        ),
      ],
      severity: "targeted",
      count: unlocatedIssues.length,
      samples: unlocatedIssues,
      message:
        "Some blocking layout facts do not include a Section/Tool location. Inspect their supplied slot and metrics before changing the artifact.",
      nextActions: [
        "Trace each sample to its rendered element and repair the smallest responsible JSX fragment.",
        "Preserve viewports that already pass and do not suppress the validator with overflow clipping.",
        "After editing the owning Section, rerun verify_browser_matrix for desktop, tablet, and mobile and continue repairing until all evidence is current.",
      ],
    });
  }

  return facts;
}

function addElementEvidence(
  sections: Map<number, SectionEvidence>,
  target: LayoutRecord,
  type: "element" | "image",
  sourceCode: "layout_element_issue" | "layout_image_issue",
  viewportWidth?: number,
) {
  const sectionIndex = getNumber(target, "sectionIndex");
  if (sectionIndex === undefined) {
    return false;
  }

  // Grid-area containment has its own structured record and paint bounds.
  // Keeping those codes on the element sample would associate them with the
  // element's scroll metrics and project the same failure twice.
  const issues = getStringArray(target, "issues").filter(
    (issue) => !issue.includes("grid-area-overflow"),
  );
  if (issues.length === 0) {
    return true;
  }

  const evidence = getSectionEvidence(sections, sectionIndex);
  const toolIndex = getNumber(target, "toolIndexInSection");
  const overflow = readElementOverflow(target, issues, viewportWidth);
  const computed = getRecord(target, "computed");
  const metrics = getRecord(target, "metrics");
  const unusedBottom = getNumber(metrics, "unusedBottom");
  const allowedUnusedBottom = getNumber(
    metrics,
    "excessiveUnusedSpaceThreshold",
  );
  const unusedTrailingRows = getNumber(metrics, "unusedTrailingRows");
  const minimumStructuralTrailingRows = getNumber(
    metrics,
    "minimumStructuralTrailingRows",
  );
  const structuralUnusedSpaceThreshold = getNumber(
    metrics,
    "structuralUnusedSpaceThreshold",
  );
  const sectionRows = getNumber(metrics, "sectionRows");
  const maximumUsedRowEnd = getNumber(metrics, "maximumUsedRowEnd");
  const unusedSpaceDetection = getString(metrics, "unusedSpaceDetection");
  const activeAllowedUnusedBottom =
    unusedSpaceDetection === "empty-grid-rows"
      ? structuralUnusedSpaceThreshold ?? allowedUnusedBottom
      : allowedUnusedBottom;

  addToolIndex(evidence, toolIndex);
  captureSectionLayout(evidence, getRecord(target, "sectionGrid"));
  evidence.hasImageIssue ||= type === "image";
  evidence.hasHorizontalOverflow ||=
    issues.some((issue) => horizontalElementIssues.has(issue));
  evidence.hasVerticalOverflow ||=
    issues.some((issue) => verticalElementIssues.has(issue));
  evidence.hasLowContrast ||= issues.includes("low-text-contrast");
  evidence.hasSuspiciousHiddenText ||=
    hasInvisibleFormattingCharacters(getString(target, "text")) &&
    (issues.includes("zero-size") ||
      issues.includes("invisible") ||
      issues.includes("clipped-content-y"));
  evidence.hasEmptyVisibleTool ||= issues.includes("empty-visible-tool");
  evidence.hasExcessiveUnusedSpace ||=
    issues.includes("section-excessive-unused-space");
  mergeOverflow(evidence.maxOverflow, overflow);
  addSample(evidence, compactRecord({
    sourceCode,
    type,
    dataSlot: getString(target, "dataSlot"),
    sectionId: getString(target, "sectionId"),
    toolId: getString(target, "toolId"),
    sectionIndex,
    toolIndexInSection: toolIndex,
    issues,
    gridArea: getRecord(target, "gridArea"),
    rect: getRecord(target, "rect"),
    overflow: Object.keys(overflow).length > 0 ? overflow : undefined,
    contrast: issues.includes("low-text-contrast")
      ? compactRecord({
          color: getString(computed, "color"),
          background: getString(computed, "effectiveBackgroundColor"),
          ratio: getNumber(computed, "contrastRatio"),
          threshold: getNumber(computed, "contrastThreshold"),
        })
      : undefined,
    unusedBottom: issues.includes("section-excessive-unused-space")
      ? unusedBottom
      : undefined,
    allowedUnusedBottom: issues.includes("section-excessive-unused-space")
      ? activeAllowedUnusedBottom
      : undefined,
    unusedTrailingRows: issues.includes("section-excessive-unused-space")
      ? unusedTrailingRows
      : undefined,
    minimumTrailingRows: issues.includes("section-excessive-unused-space")
      ? minimumStructuralTrailingRows
      : undefined,
    sectionRows: issues.includes("section-excessive-unused-space")
      ? sectionRows
      : undefined,
    maximumUsedRowEnd: issues.includes("section-excessive-unused-space")
      ? maximumUsedRowEnd
      : undefined,
    unusedSpaceDetection: issues.includes("section-excessive-unused-space")
      ? unusedSpaceDetection
      : undefined,
    excessUnusedBottom:
      issues.includes("section-excessive-unused-space") &&
        unusedBottom !== undefined &&
        activeAllowedUnusedBottom !== undefined
        ? Math.round((unusedBottom - activeAllowedUnusedBottom) * 10) / 10
        : undefined,
    text: compactText(getString(target, "text"), 80),
  }));
  return true;
}

function buildSectionFact(evidence: SectionEvidence) {
  const toolIndexes = [...evidence.toolIndexes].sort((a, b) => a - b);
  const toolLabel = toolIndexes.length > 0
    ? `Tool${toolIndexes.length === 1 ? "" : "s"} ${toolIndexes.join(", ")}`
    : "its contained Tools";
  const { top, right, bottom, left } = evidence.maxOverflow;
  const materialOverflow = Math.max(top, right, bottom, left) > 16;
  const structural =
    evidence.hasSectionContainment ||
    evidence.hasOverlap ||
    (materialOverflow &&
      (toolIndexes.length > 1 || evidence.samples.length > 1));
  const candidateActions: Array<{ priority: number; text: string }> = [];
  const hasHorizontalOverflow =
    evidence.hasHorizontalOverflow || right > 0 || left > 0;
  const hasVerticalOverflow =
    evidence.hasVerticalOverflow || top > 0 || bottom > 0;

  if (evidence.hasSuspiciousHiddenText) {
    candidateActions.push({
      priority: 0,
      text: `Remove the artificial hidden or formatting-character-heavy text in ${toolLabel}; restore its real visible source requirement instead of resizing the layout to accommodate validator filler.`,
    });
  }

  if (hasHorizontalOverflow) {
    candidateActions.push({
      priority: 10,
      text: `Widen or reposition ${toolLabel} by at least ${formatPixels(Math.max(left, right))}, remove fixed widths/margins, or stack it at this breakpoint; do not hide the content with overflow clipping.`,
    });
  }

  if (evidence.hasOverlap) {
    const affectedSections = [...evidence.affectedSectionIndexes].sort(
      (a, b) => a - b,
    );
    candidateActions.push({
      priority: 20,
      text:
        affectedSections.length > 0
          ? `Section ${evidence.sectionIndex} overflows into Section ${affectedSections.join(", ")}. Repair only ${toolLabel} in the owning Section and preserve the unaffected Section; avoid z-index or absolute-position patches.`
          : `Assign the overlapping Tools in Section ${evidence.sectionIndex} to non-overlapping GridAreas; avoid z-index or absolute-position patches unless the overlap is explicitly intentional.`,
    });
  }

  if (evidence.hasLowContrast) {
    candidateActions.push({
      priority: 50,
      text: `Raise the reported text/background contrast in ${toolLabel} to the measured threshold. If text is intended to overlay media, place it inside the image-backed Tool instead of leaving it on the Section background.`,
    });
  }

  if (evidence.hasEmptyVisibleTool) {
    candidateActions.push({
      priority: 30,
      text: `Remove the empty visible ${toolLabel}. Create spacing with Section rows, GridArea placement, padding, or gap rather than an empty Text Tool.`,
    });
  }

  if (evidence.hasExcessiveUnusedSpace) {
    candidateActions.push({
      priority: 40,
      text: `Reduce Section ${evidence.sectionIndex}'s unused bottom rows/height or redistribute its real content; do not add filler or invisible spacer Tools.`,
    });
  }

  if (bottom > 0) {
    candidateActions.push({
      priority: 25,
      text: `Increase ${toolLabel}'s row span and Section ${evidence.sectionIndex}'s responsive rows/height by at least ${formatPixels(bottom)}, or reduce fixed media height, padding, and content density by the same amount.`,
    });
  } else if (top > 0) {
    candidateActions.push({
      priority: 25,
      text: `The measured overflow is ${formatPixels(top)} above its GridArea. Inspect line-height, vertical alignment, negative margins, and transforms in ${toolLabel} before increasing the entire Section height.`,
    });
  } else if (hasVerticalOverflow) {
    candidateActions.push({
      priority: 25,
      text: `Increase ${toolLabel}'s row span and Section ${evidence.sectionIndex}'s responsive rows/height, or reduce fixed media height and content density.`,
    });
  }

  if (evidence.hasImageIssue) {
    candidateActions.push({
      priority: 15,
      text: `Repair the exact image sample in Section ${evidence.sectionIndex}: ensure it loads, has meaningful alt text, preserves aspect ratio, and has explicit dimensions.`,
    });
  }

  if (candidateActions.length === 0) {
    candidateActions.push({
      priority: 100,
      text: `Inspect the supplied slot and issue codes in ${toolLabel}, then repair the smallest responsible layout rule without changing already-passing breakpoints.`,
    });
  }

  const firstAction = structural
    ? `Repair Section ${evidence.sectionIndex} and ${toolLabel} together as one coherent breakpoint layout; rewrite its grid, rows, spans, and placement instead of accumulating isolated patches.`
    : `Repair Section ${evidence.sectionIndex}, ${toolLabel}, using the exact sample metrics while preserving viewports that already pass.`;

  return {
    factType: "section",
    sourceCodes: [
      ...new Set(
        evidence.samples.flatMap((sample) =>
          getString(sample, "sourceCode")
            ? [getString(sample, "sourceCode")!]
            : [],
        ),
      ),
    ],
    severity: structural ? "structural" : "targeted",
    layout: evidence.sectionLayout
      ? splitSectionLayout(evidence.sectionLayout)
      : undefined,
    count: evidence.samples.length,
    samples: evidence.samples.map((sample) => {
      const { sourceCode: _sourceCode, ...visibleSample } = sample;
      return visibleSample;
    }),
    message: `Section ${evidence.sectionIndex} has ${evidence.samples.length} blocking layout ${evidence.samples.length === 1 ? "fact" : "facts"} affecting ${toolLabel}.`,
    nextActions: [
      firstAction,
      ...candidateActions
        .sort((left, right) => left.priority - right.priority)
        .map((action) => action.text),
      `After editing Section ${evidence.sectionIndex}, rerun verify_browser_matrix for desktop, tablet, and mobile and continue repairing until all evidence is current.`,
    ],
  };
}

function captureSectionLayout(
  evidence: SectionEvidence,
  sectionLayout: LayoutRecord | undefined,
) {
  if (!sectionLayout || evidence.sectionLayout) return;
  evidence.sectionLayout = sectionLayout;
}

function splitSectionLayout(sectionLayout: LayoutRecord) {
  const { authored, ...computed } = sectionLayout;
  return compactRecord({
    authored: getRecord({ authored }, "authored"),
    computed,
  });
}

function getSectionEvidence(
  sections: Map<number, SectionEvidence>,
  sectionIndex: number,
) {
  const existing = sections.get(sectionIndex);
  if (existing) {
    return existing;
  }

  const created: SectionEvidence = {
    sectionIndex,
    affectedSectionIndexes: new Set(),
    samples: [],
    sampleKeys: new Set(),
    toolIndexes: new Set(),
    maxOverflow: { top: 0, right: 0, bottom: 0, left: 0 },
    hasOverlap: false,
    hasImageIssue: false,
    hasSectionContainment: false,
    hasHorizontalOverflow: false,
    hasVerticalOverflow: false,
    hasLowContrast: false,
    hasSuspiciousHiddenText: false,
    hasEmptyVisibleTool: false,
    hasExcessiveUnusedSpace: false,
  };
  sections.set(sectionIndex, created);
  return created;
}

function hasInvisibleFormattingCharacters(value: string | undefined) {
  return value ? /\p{Cf}/u.test(value) : false;
}

function chooseOverlapOwnerSection(
  aSectionIndex: number | undefined,
  bSectionIndex: number | undefined,
) {
  if (aSectionIndex === undefined) {
    return bSectionIndex;
  }
  if (bSectionIndex === undefined || aSectionIndex === bSectionIndex) {
    return aSectionIndex;
  }

  // Sections are rendered in document order. For a cross-Section collision, the
  // earlier Section is the one whose content extends into the following Section.
  return Math.min(aSectionIndex, bSectionIndex);
}

function addSample(evidence: SectionEvidence, sample: LayoutRecord) {
  const key = JSON.stringify(sample);
  if (evidence.sampleKeys.has(key)) {
    return;
  }
  evidence.sampleKeys.add(key);
  evidence.samples.push(sample);
}

function addToolIndex(evidence: SectionEvidence, toolIndex?: number) {
  if (toolIndex !== undefined) {
    evidence.toolIndexes.add(toolIndex);
  }
}

function readElementOverflow(
  target: LayoutRecord,
  issues: string[],
  viewportWidth?: number,
) {
  const metrics = getRecord(target, "metrics");
  const rect = getRecord(target, "rect");
  const horizontal = issues.some((issue) => horizontalElementIssues.has(issue));
  const vertical = issues.some((issue) => verticalElementIssues.has(issue));

  return compactRecord({
    right: horizontal
      ? Math.max(
          positiveDifference(
            getNumber(metrics, "scrollWidth"),
            getNumber(metrics, "clientWidth"),
          ) ?? 0,
          issues.includes("outside-viewport-x")
            ? positiveDifference(getNumber(rect, "right"), viewportWidth) ?? 0
            : 0,
        )
      : undefined,
    left:
      horizontal && issues.includes("outside-viewport-x")
        ? positiveDifference(0, getNumber(rect, "left"))
        : undefined,
    bottom: vertical
      ? positiveDifference(
          getNumber(metrics, "scrollHeight"),
          getNumber(metrics, "clientHeight"),
        )
      : undefined,
  });
}

function findDocumentOverflowOwner(sections: Map<number, SectionEvidence>) {
  return [...sections.values()]
    .filter((section) =>
      section.samples.some((sample) =>
        getStringArray(sample, "issues").includes("outside-viewport-x"),
      ),
    )
    .sort(
      (left, right) =>
        Math.max(right.maxOverflow.left, right.maxOverflow.right) -
          Math.max(left.maxOverflow.left, left.maxOverflow.right) ||
        left.sectionIndex - right.sectionIndex,
    )[0];
}

function buildUnlocatedDocumentOverflowFact(overflowPixels: number) {
  return compactRecord({
    code: "document-horizontal-overflow",
    sourceCodes: ["layout_horizontal_overflow"],
    severity: "structural",
    count: 1,
    samples: [compactRecord({ overflowRight: overflowPixels })],
    message: `The document is ${formatPixels(overflowPixels)} wider than the viewport, but no Section owner could be established from rendered targets.`,
    nextActions: [
      "Inspect Section and Tool bounds to identify the element extending the document width.",
      `Remove or override the responsible fixed width, minimum width, transform, or horizontal margin by at least ${formatPixels(overflowPixels)}; stack the Tool at this breakpoint when necessary.`,
      "Do not hide the failure with overflow-x clipping because that can conceal visible content.",
      "After locating and editing the owning Section, rerun verify_browser_matrix for desktop, tablet, and mobile.",
    ],
  });
}

function readOverflow(record: LayoutRecord) {
  const overflow = getRecord(record, "overflow");
  return compactRecord({
    top: positiveNumber(getNumber(overflow, "top")),
    right: positiveNumber(getNumber(overflow, "right")),
    bottom: positiveNumber(getNumber(overflow, "bottom")),
    left: positiveNumber(getNumber(overflow, "left")),
  });
}

function mergeOverflow(
  target: SectionEvidence["maxOverflow"],
  overflow: LayoutRecord,
) {
  for (const direction of ["top", "right", "bottom", "left"] as const) {
    target[direction] = Math.max(
      target[direction],
      getNumber(overflow, direction) ?? 0,
    );
  }
}

function compactElementReference(record: LayoutRecord, prefix: "a" | "b") {
  return compactRecord({
    dataSlot: getString(record, `${prefix}DataSlot`),
    sectionId: getString(record, `${prefix}SectionId`),
    toolId: getString(record, `${prefix}ToolId`),
    sectionIndex: getNumber(record, `${prefix}SectionIndex`),
    toolIndexInSection: getNumber(record, `${prefix}ToolIndexInSection`),
    slotIndexInTool: getNumber(record, `${prefix}SlotIndexInTool`),
    text: compactText(getString(record, `${prefix}Text`), 60),
  });
}

function compactUnlocatedIssue(issue: LayoutRecord) {
  const target = getRecord(issue, "element") ?? getRecord(issue, "image");
  return compactRecord({
    code: getString(issue, "code"),
    dataSlot: getString(target, "dataSlot"),
    sectionId: getString(target, "sectionId"),
    toolId: getString(target, "toolId"),
    issues: getStringArray(target, "issues"),
    message: compactText(getString(issue, "message"), 120),
  });
}

function positiveDifference(
  larger: number | undefined,
  smaller: number | undefined,
) {
  return larger === undefined || smaller === undefined
    ? undefined
    : positiveNumber(larger - smaller);
}

function positiveNumber(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? Math.round(value * 10) / 10
    : undefined;
}

function formatPixels(value: number | undefined) {
  return value !== undefined && value > 0
    ? `${Math.ceil(value)}px`
    : "the measured amount";
}

function compactText(value: string | undefined, maxLength: number) {
  if (!value) {
    return undefined;
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

function compactRecord(record: LayoutRecord) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

function getRecord(record: LayoutRecord | undefined, key: string) {
  const value = record?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as LayoutRecord)
    : undefined;
}

function getRecordArray(record: LayoutRecord, key: string) {
  const values = record[key];
  return Array.isArray(values)
    ? values.filter(
        (value): value is LayoutRecord =>
          Boolean(value) && typeof value === "object" && !Array.isArray(value),
      )
    : [];
}

function getString(record: LayoutRecord | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function getNumber(record: LayoutRecord | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function getStringArray(record: LayoutRecord | undefined, key: string) {
  const value = record?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
