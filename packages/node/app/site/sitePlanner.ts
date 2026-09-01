import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { fetch, ProxyAgent } from "undici";
import { agentConfig } from "../agentConfig.ts";
import { buildSitePlannerPrompt } from "../prompts/sitePlanner.ts";
import { normalizeSitePlan, type SiteDeliveryPlanDraft } from "./sitePlanPolicy.ts";
import type { SiteDocument, SiteEditTarget } from "@designer-agent/site-contract";
import { siteAuditLogger } from "../logging/siteAuditLogger.ts";

const designContractSchema = z.object({
  brand: z.object({ productName: z.string(), visualDirection: z.string(), tone: z.string() }),
  sharedCopy: z.object({ primaryCta: z.string().nullable(), secondaryCta: z.string().nullable(), footerCopy: z.string().nullable() }),
  typographyRules: z.array(z.string()), colorRules: z.array(z.string()), imageryRules: z.array(z.string()),
  responsiveRules: z.array(z.string()), consistencyRules: z.array(z.string()),
  shellRequirements: z.object({ header: z.array(z.string()), footer: z.array(z.string()) }),
});

export const siteDeliveryPlanDraftSchema = z.object({
  siteObjective: z.string(),
  shellTask: z.object({ action: z.enum(["create", "modify", "keep"]), requirements: z.array(z.string()) }),
  pageTasks: z.array(z.object({
    taskKey: z.string(),
    target: z.object({
      kind: z.enum(["existing", "new"]),
      pageId: z.string().nullable(),
      suggestedTitle: z.string().nullable(),
      suggestedRoute: z.string().nullable(),
    }),
    action: z.enum(["create", "modify", "remove"]),
    title: z.string().nullable(),
    route: z.string().nullable(),
    objective: z.string(),
    requirements: z.array(z.string()),
  })).max(5),
  navigation: z.object({
    brandTargetTaskKeyOrPageId: z.string(),
    items: z.array(z.object({
      id: z.string().nullable(),
      label: z.string(),
      targetTaskKeyOrPageId: z.string(),
    })),
    primaryAction: z.object({ label: z.string(), targetTaskKeyOrPageId: z.string() }).nullable(),
    secondaryAction: z.object({ label: z.string(), targetTaskKeyOrPageId: z.string() }).nullable(),
  }),
  designContract: designContractSchema,
});

let client: OpenAI | undefined;

export function summarizeSiteForPlanner(site: SiteDocument) {
  return {
    id: site.id,
    title: site.title,
    version: site.version,
    navigation: site.navigation,
    pages: site.pages.map((page) => ({
      id: page.id,
      title: page.body.title,
      route: page.route,
      version: page.body.version,
      sectionSummary: page.body.sections.map((section) => section.name),
    })),
    sharedShellSummary: {
      header: {
        mounted: site.sharedShell.header.mounted,
        sections: site.sharedShell.header.sections.map((section) => section.name),
      },
      footer: {
        mounted: site.sharedShell.footer.mounted,
        sections: site.sharedShell.footer.sections.map((section) => section.name),
      },
    },
  };
}

export async function runSitePlanner(input: {
  request: string;
  designSystemId: number;
  site: SiteDocument;
  target: SiteEditTarget;
  signal?: AbortSignal;
}) {
  if (!agentConfig.model.apiKey) throw new Error("OPEN_AI_KEY is required to plan a site.");
  client ??= createClient();
  const currentSite = summarizeSiteForPlanner(input.site);
  const response = await client.responses.parse({
    model: agentConfig.model.designerModel,
    store: agentConfig.model.storeResponses,
    instructions: "You are SitePlannerAgent. Plan only. For an existing target, provide pageId and set suggestedTitle/suggestedRoute to null. For a new target, set pageId to null and provide suggestedTitle/suggestedRoute. Reuse supplied page ids for existing targets, but never invent final ids for new pages. Every navigation target, including the brand and actions, must be an exact page taskKey or existing pageId without a fragment or query. Preserve an existing navigation item id when retaining that item; use null only for a genuinely new item. Never emit JSX, artifact paths, workspace paths, batches, or versions. Every schema field is required; use null for nullable title, route, navigation actions, or shared-copy values when no value is needed.",
    input: buildSitePlannerPrompt({ request: input.request, designSystemId: input.designSystemId, currentSite, target: input.target }),
    text: { format: zodTextFormat(siteDeliveryPlanDraftSchema, "site_delivery_plan"), verbosity: "low" },
  }, { signal: input.signal });
  if (!response.output_parsed) throw new Error("site_plan_unreadable");
  siteAuditLogger.record("site.plan.model_completed", {
    model: agentConfig.model.designerModel,
    usage: response.usage,
  });
  return normalizeSitePlan(input.site, input.target, response.output_parsed as SiteDeliveryPlanDraft);
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
