import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { SiteDesignContract, SiteDocument, SiteEditTarget } from "@designer-agent/site-contract";
import { fetch, ProxyAgent } from "undici";
import { agentConfig } from "../agentConfig.ts";
import { siteAuditLogger } from "../logging/siteAuditLogger.ts";
import type { SiteUnimplementedRequirement } from "./unimplementedRequirement.ts";

export type SiteReviewResult = {
  status: "accepted" | "rejected" | "review_unavailable";
  issues: Array<{
    message: string;
    owner: { kind: "page-body"; pageId: string } | { kind: "shared-region"; region: "header" | "footer" } | { kind: "unlocated" };
  }>;
};

export type SiteReviewProvider = (input: {
  site: SiteDocument;
  designContract: SiteDesignContract;
  target?: SiteEditTarget;
  screenshots: Array<{ pageId: string; viewport: "desktop" | "mobile"; path: string }>;
  unimplementedRequirements?: SiteUnimplementedRequirement[];
  signal?: AbortSignal;
}) => Promise<SiteReviewResult>;

const ownerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("page-body"), pageId: z.string() }),
  z.object({ kind: z.literal("shared-region"), region: z.enum(["header", "footer"]) }),
  z.object({ kind: z.literal("unlocated") }),
]);
const reviewSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  issues: z.array(z.object({ message: z.string(), owner: ownerSchema })).max(12),
});

let client: OpenAI | undefined;

export async function runSiteReviewerAgent(
  input: Parameters<SiteReviewProvider>[0],
  reviewer: SiteReviewProvider,
) {
  const desktop = input.screenshots.filter((shot) => shot.viewport === "desktop").slice(0, 5);
  const homeMobile = input.screenshots.find((shot) =>
    shot.viewport === "mobile" && input.site.pages.find((page) => page.id === shot.pageId)?.route === "/",
  );
  const budgeted = [...desktop, ...(homeMobile ? [homeMobile] : [])].slice(0, 8);
  try {
    return await reviewer({ ...input, screenshots: budgeted });
  } catch (error) {
    if (isInfrastructureUnavailable(error)) {
      return { status: "review_unavailable", issues: [] } satisfies SiteReviewResult;
    }
    throw error;
  }
}

export async function runDefaultSiteReview(input: {
  batchId: string;
  site: SiteDocument;
  designContract: SiteDesignContract;
  target?: SiteEditTarget;
  renderedSources: Record<string, string>;
  unimplementedRequirements?: SiteUnimplementedRequirement[];
  signal?: AbortSignal;
}) {
  return runSiteReviewerAgent(
    { site: input.site, designContract: input.designContract, target: input.target, screenshots: [], unimplementedRequirements: input.unimplementedRequirements, signal: input.signal },
    async (reviewInput) => {
      if (!agentConfig.model.apiKey) {
        throw new Error("site_reviewer_infrastructure_unavailable:OPEN_AI_KEY_missing");
      }
      const { captureSiteReviewScreenshots } = await import("../agent.ts");
      const screenshots = await captureSiteReviewScreenshots({
        batchId: input.batchId,
        signal: reviewInput.signal,
        pages: input.site.pages.map((page) => ({
          pageId: page.id,
          route: page.route,
          source: input.renderedSources[page.id]!,
        })),
      });
      const budgeted = budgetScreenshots(input.site, screenshots);
      try {
        client ??= createClient();
        const response = await client.responses.parse({
          model: agentConfig.model.reviewerModel,
          store: agentConfig.model.storeResponses,
          instructions: [
            "You are SiteReviewerAgent, an independent read-only cross-page visual gate.",
            "Check brand consistency, shared Header/Footer behavior, navigation, CTA semantics, hierarchy, responsive consistency, and whether the pages form a coherent product.",
            "The structural gate supplies Overlay summaries. Reject dangling Button overlay targets, duplicate Overlay ids, an AlertDialog used with non-blocking dismissal semantics, or any Overlay represented inside a Section instead of directly under Root.",
            "A shared region with mounted=false is preserved source data and is intentionally absent from screenshots. Do not reject a site solely because an unmounted Header or Footer is not visible.",
            "Do not repeat single-page runtime or grid checks. Reject only concrete cross-page defects and assign each issue to the smallest page body or shared region owner.",
            "The authorized edit target is a hard boundary. Do not reject for a defect outside that target; such a defect is inherited context for this delivery. Use unlocated only when the visual evidence cannot establish whether the defect belongs to a page body, Header, or Footer.",
            "Designer implementation-limit declarations are authoritative. Do not verify them, reject the site because the declared functionality is absent, or create an issue whose only basis is a declared requirement. Judge declared alternatives on their actual cross-page quality and review all remaining requirements normally.",
          ].join(" "),
          input: [{
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  site: summarizeSiteForReview(reviewInput.site),
                  designContract: reviewInput.designContract,
                  authorizedTarget: reviewInput.target ?? { kind: "site" },
                  unimplementedRequirements: reviewInput.unimplementedRequirements ?? [],
                }),
              },
              ...budgeted.map((shot) => ({
                type: "input_image" as const,
                image_url: shot.path,
                detail: "low" as const,
              })),
            ],
          }],
          text: { format: zodTextFormat(reviewSchema, "site_review"), verbosity: "low" },
        }, { signal: reviewInput.signal });
        if (!response.output_parsed) throw new Error("site_reviewer_invalid_result");
        siteAuditLogger.record("site.reviewer.model_completed", {
          model: agentConfig.model.reviewerModel,
          usage: response.usage,
          screenshotCount: budgeted.length,
        });
        return response.output_parsed satisfies SiteReviewResult;
      } catch (error) {
        if (error instanceof Error && error.message === "site_reviewer_invalid_result") throw error;
        throw new Error(`site_reviewer_infrastructure_unavailable:${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}

function budgetScreenshots(site: SiteDocument, screenshots: Parameters<SiteReviewProvider>[0]["screenshots"]) {
  const desktop = screenshots.filter((shot) => shot.viewport === "desktop").slice(0, 5);
  const homeMobile = screenshots.find((shot) =>
    shot.viewport === "mobile" && site.pages.find((page) => page.id === shot.pageId)?.route === "/",
  );
  return [...desktop, ...(homeMobile ? [homeMobile] : [])].slice(0, 8);
}

export function summarizeSiteForReview(site: SiteDocument) {
  return {
    id: site.id,
    title: site.title,
    navigation: site.navigation,
    sharedShell: {
      header: {
        mounted: site.sharedShell.header.mounted,
        sectionIds: site.sharedShell.header.sections.map((section) => section.id),
      },
      footer: {
        mounted: site.sharedShell.footer.mounted,
        sectionIds: site.sharedShell.footer.sections.map((section) => section.id),
      },
    },
    pages: site.pages.map((page) => ({
      id: page.id,
      title: page.body.title,
      route: page.route,
      overlays: (page.body.overlays ?? []).map((overlay) => ({
        id: overlay.id,
        type: overlay.type,
        props: overlay.props,
      })),
      overlayTriggers: page.body.sections.flatMap((section) =>
        section.tools.flatMap((tool) => {
          const action = tool.type === "button" ? tool.props.action : undefined;
          return action && typeof action === "object" && !Array.isArray(action) &&
            (action as Record<string, unknown>).type === "overlay"
            ? [{ buttonId: tool.id, targetId: (action as Record<string, unknown>).targetId }]
            : [];
        }),
      ),
    })),
  };
}

function createClient() {
  const proxy = agentConfig.model.proxyURL ? new ProxyAgent(agentConfig.model.proxyURL) : undefined;
  return new OpenAI({
    apiKey: agentConfig.model.apiKey,
    baseURL: agentConfig.model.baseURL,
    timeout: agentConfig.model.requestTimeoutMs,
    // @ts-expect-error undici fetch is compatible with the OpenAI client at runtime.
    fetch,
    ...(proxy ? { fetchOptions: { dispatcher: proxy } } : {}),
  });
}

function isInfrastructureUnavailable(error: unknown) {
  return error instanceof Error && error.message.startsWith("site_reviewer_infrastructure_unavailable");
}
