import type { CompactReview } from "../compactProductQuality.ts";
import type { PageDocument, PagePatch } from "@designer-agent/site-contract";
import type { UnimplementedRequirement } from "../reviewer/unimplementedRequirement.ts";

export type StagedPageDelivery = {
  batchId: string;
  taskId: string;
  pageId: string;
  action: "create" | "modify";
  basePageVersion: number | null;
  body: PageDocument;
  bodyPatch: PagePatch;
  bodySource: string;
  bodySourceDigest: string;
  composedSource: string;
  composedSourceDigest: string;
  verificationDigest: string;
  qualityStatus: "passed" | "review_skipped" | "review_unavailable" | "best_effort";
  pageReview?: CompactReview;
  unimplementedRequirements?: UnimplementedRequirement[];
};
