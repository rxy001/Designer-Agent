export const MODEL_REPAIR_ISSUE_CODES = [
  "broken-image",
  "clipped-content-x",
  "clipped-content-y",
  "content-scroll-overflow-x",
  "content-scroll-overflow-y",
  "distorted-aspect-ratio",
  "document-horizontal-overflow",
  "empty-action",
  "empty-visible-tool",
  "grid-area-overflow",
  "invisible",
  "low-text-contrast",
  "missing-alt",
  "outside-viewport-x",
  "outside-viewport-y",
  "pending-image",
  "section-excessive-unused-space",
  "unintended-overlap",
  "unlocated-layout-issue",
  "unknown-layout-issue",
  "zero-size",
] as const;

export type ModelRepairIssueCode = (typeof MODEL_REPAIR_ISSUE_CODES)[number];

const knownModelRepairIssueCodes = new Set<string>(MODEL_REPAIR_ISSUE_CODES);

const codeAliases: Readonly<Record<string, ModelRepairIssueCode>> = {
  "layout-horizontal-overflow": "document-horizontal-overflow",
  "layout-unintended-overlap": "unintended-overlap",
  "section-grid-area-overflow": "grid-area-overflow",
  "text-overflow-x": "content-scroll-overflow-x",
  "text-overflow-y": "content-scroll-overflow-y",
  "tool-grid-area-overflow": "grid-area-overflow",
};

const modelRepairWrapperCodes = new Set([
  "section-layout-repair",
  "layout-element-issue",
  "layout-grid-area-containment",
  "layout-image-issue",
]);

export function normalizeReportIssueCode(code: string) {
  return code.replaceAll("_", "-");
}

/** Model-facing codes are canonical, finite, observable failure categories. */
export function normalizeModelRepairIssueCode(
  code: string,
): ModelRepairIssueCode {
  const normalized = normalizeReportIssueCode(code);
  const alias = codeAliases[normalized];
  if (alias) return alias;
  return knownModelRepairIssueCodes.has(normalized)
    ? (normalized as ModelRepairIssueCode)
    : "unknown-layout-issue";
}

export function isModelRepairWrapperCode(code: string) {
  return modelRepairWrapperCodes.has(normalizeReportIssueCode(code));
}
