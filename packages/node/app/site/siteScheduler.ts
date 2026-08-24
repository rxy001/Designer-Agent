import { Semaphore } from "../runtime/semaphore.ts";
import { agentConfig } from "../agentConfig.ts";

export const siteDeliveryLimits = {
  maxPages: 5,
  maxConcurrentPageAgents: 2,
  maxConcurrentBrowserMatrices: 1,
  maxConcurrentPageReviewers: 1,
  maxConcurrentSiteReviewers: 1,
  maxSiteRepairCycles: 2,
  shellAgentTimeoutMs: agentConfig.site.timeouts.shellAgentMs,
  pageAgentTimeoutMs: agentConfig.site.timeouts.pageAgentMs,
  siteReviewerTimeoutMs: agentConfig.site.timeouts.reviewerMs,
} as const;

const sharedSiteRuntimeResources = {
  pages: new Semaphore(siteDeliveryLimits.maxConcurrentPageAgents),
  browser: new Semaphore(siteDeliveryLimits.maxConcurrentBrowserMatrices),
  pageReviewer: new Semaphore(siteDeliveryLimits.maxConcurrentPageReviewers),
  siteReviewer: new Semaphore(siteDeliveryLimits.maxConcurrentSiteReviewers),
};

/** Process-wide resource gates shared by every Site generation batch. */
export const siteRuntimeResources = {
  browser: sharedSiteRuntimeResources.browser,
  pageReviewer: sharedSiteRuntimeResources.pageReviewer,
  siteReviewer: sharedSiteRuntimeResources.siteReviewer,
};

export class SiteScheduler {
  readonly browser = sharedSiteRuntimeResources.browser;
  readonly pageReviewer = sharedSiteRuntimeResources.pageReviewer;
  readonly siteReviewer = sharedSiteRuntimeResources.siteReviewer;
  #pages = sharedSiteRuntimeResources.pages;

  runPages<T, R>(items: T[], worker: (item: T, index: number) => Promise<R>) {
    if (items.length > siteDeliveryLimits.maxPages) {
      throw new Error(`A site delivery cannot exceed ${siteDeliveryLimits.maxPages} pages.`);
    }
    return Promise.all(items.map((item, index) => this.#pages.use(() => worker(item, index))));
  }
}
