export function filterNewDeliveryIssues(
  candidateIssues: Array<Record<string, unknown>>,
  baselineIssues: Array<Record<string, unknown>>,
) {
  const baselineSeverities = new Map<string, number[]>();

  for (const issue of baselineIssues) {
    const fingerprint = issueFingerprint(issue);
    const severities = baselineSeverities.get(fingerprint) ?? [];
    severities.push(issueSeverity(issue));
    baselineSeverities.set(fingerprint, severities);
  }

  return candidateIssues.filter((issue) => {
    const fingerprint = issueFingerprint(issue);
    const severities = baselineSeverities.get(fingerprint) ?? [];
    const candidateSeverity = issueSeverity(issue);
    const matchingIndex = severities.findIndex(
      (baselineSeverity) => baselineSeverity + 0.5 >= candidateSeverity,
    );

    if (matchingIndex === -1) {
      return true;
    }

    severities.splice(matchingIndex, 1);
    return false;
  });
}

export function toComparableDeliveryIssues(issue: Record<string, unknown>) {
  const code = stringProperty(issue, "code") ?? "unknown";
  const viewport = stringProperty(issue, "viewport");
  const message = stringProperty(issue, "message");
  const base = compact({ code, viewport, message });

  if (code === "layout_horizontal_overflow") {
    const document = recordProperty(issue, "document");
    return [
      {
        ...base,
        regressionSeverity: Math.max(
          0,
          numberProperty(document, "scrollWidth") -
            numberProperty(document, "clientWidth"),
        ),
      },
    ];
  }

  if (code === "layout_grid_area_containment") {
    const records = arrayProperty(issue, "gridAreaContainment");
    return records.map((record) => ({
      ...base,
      ...layoutTargetIdentity(record),
      containmentType: stringProperty(record, "type"),
      regressionSeverity: sumPositiveNumbers(recordProperty(record, "overflow")),
    }));
  }

  if (code === "layout_unintended_overlap") {
    return arrayProperty(issue, "overlaps").map((record) => ({
      ...base,
      a: overlapSideIdentity(record, "a"),
      b: overlapSideIdentity(record, "b"),
      regressionSeverity: Math.max(0, numberProperty(record, "area")),
    }));
  }

  const target = recordProperty(issue, "element") ?? recordProperty(issue, "image");
  if (!target) {
    return [{ ...base, regressionSeverity: 0 }];
  }

  return [
    {
      ...base,
      ...layoutTargetIdentity(target),
      regressionSeverity: targetSeverity(target, issue),
    },
  ];
}

function issueFingerprint(issue: Record<string, unknown>) {
  const { regressionSeverity: _regressionSeverity, ...identity } = issue;
  return stableStringify(identity);
}

function issueSeverity(issue: Record<string, unknown>) {
  return typeof issue.regressionSeverity === "number"
    ? issue.regressionSeverity
    : 0;
}

function targetSeverity(
  target: Record<string, unknown>,
  issue: Record<string, unknown>,
) {
  const computed = recordProperty(target, "computed");
  const metrics = recordProperty(target, "metrics");
  const rect = recordProperty(target, "rect");
  const rendered = recordProperty(target, "rendered");
  const natural = recordProperty(target, "natural");
  const viewportWidth = numberProperty(issue, "width");
  const naturalWidth = numberProperty(natural, "width");
  const naturalHeight = numberProperty(natural, "height");
  const renderedWidth = numberProperty(rendered, "width");
  const renderedHeight = numberProperty(rendered, "height");
  const naturalRatio = naturalHeight > 0 ? naturalWidth / naturalHeight : 0;
  const renderedRatio = renderedHeight > 0 ? renderedWidth / renderedHeight : 0;

  return roundSeverity(
    Math.max(
      sumPositiveNumbers(recordProperty(target, "overflow")),
      Math.max(
        0,
        numberProperty(computed, "contrastThreshold") -
          numberProperty(computed, "contrastRatio"),
      ) * 10,
      Math.max(
        0,
        numberProperty(metrics, "scrollWidth") -
          numberProperty(metrics, "clientWidth"),
        numberProperty(metrics, "scrollHeight") -
          numberProperty(metrics, "clientHeight"),
        numberProperty(metrics, "unusedBottom"),
      ),
      Math.max(
        0,
        -numberProperty(rect, "left"),
        numberProperty(rect, "right") - viewportWidth,
      ),
      naturalRatio > 0 && renderedRatio > 0
        ? Math.abs(naturalRatio - renderedRatio) * 100
        : 0,
      arrayProperty(target, "issues").length > 0 ? 1 : 0,
    ),
  );
}

function layoutTargetIdentity(record: Record<string, unknown>) {
  const sectionId = stringProperty(record, "sectionId");
  const toolId = stringProperty(record, "toolId");

  return compact({
    dataSlot: stringProperty(record, "dataSlot"),
    sectionId,
    toolId,
    slotIndexInTool: numberPropertyOrUndefined(record, "slotIndexInTool"),
    ...(sectionId ? {} : { sectionIndex: numberPropertyOrUndefined(record, "sectionIndex") }),
    ...(toolId
      ? {}
      : { toolIndexInSection: numberPropertyOrUndefined(record, "toolIndexInSection") }),
  });
}

function overlapSideIdentity(record: Record<string, unknown>, side: "a" | "b") {
  const sectionId = stringProperty(record, `${side}SectionId`);
  const toolId = stringProperty(record, `${side}ToolId`);

  return compact({
    dataSlot: stringProperty(record, `${side}DataSlot`),
    sectionId,
    toolId,
    slotIndexInTool: numberPropertyOrUndefined(record, `${side}SlotIndexInTool`),
    ...(sectionId
      ? {}
      : { sectionIndex: numberPropertyOrUndefined(record, `${side}SectionIndex`) }),
    ...(toolId
      ? {}
      : {
          toolIndexInSection: numberPropertyOrUndefined(
            record,
            `${side}ToolIndexInSection`,
          ),
        }),
  });
}

function arrayProperty(value: Record<string, unknown>, key: string) {
  const next = value[key];
  return Array.isArray(next)
    ? next.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];
}

function recordProperty(value: Record<string, unknown>, key: string) {
  const next = value[key];
  return typeof next === "object" && next !== null && !Array.isArray(next)
    ? (next as Record<string, unknown>)
    : undefined;
}

function stringProperty(value: Record<string, unknown>, key: string) {
  const next = value[key];
  return typeof next === "string" ? next : undefined;
}

function numberProperty(value: Record<string, unknown> | undefined, key: string) {
  const next = value?.[key];
  return typeof next === "number" && Number.isFinite(next) ? next : 0;
}

function numberPropertyOrUndefined(value: Record<string, unknown>, key: string) {
  const next = value[key];
  return typeof next === "number" && Number.isFinite(next) ? next : undefined;
}

function sumPositiveNumbers(value: Record<string, unknown> | undefined) {
  return value
    ? Object.values(value).reduce<number>(
        (total, item) => total + (typeof item === "number" ? Math.max(0, item) : 0),
        0,
      )
    : 0;
}

function roundSeverity(value: number) {
  return Math.round(value * 10) / 10;
}

function compact(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}

function stableStringify(value: unknown) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, nestedValue]) => [key, sortValue(nestedValue)]),
    );
  }

  return value;
}
