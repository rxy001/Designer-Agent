import { AsyncLocalStorage } from "node:async_hooks";

export type SiteLogContext = {
  siteId?: string;
  batchId?: string;
  planId?: string;
  requestId?: string;
  pageId?: string;
  region?: "header" | "footer";
  attempt?: number;
};

const storage = new AsyncLocalStorage<SiteLogContext>();

export function getSiteLogContext() {
  return storage.getStore();
}

export function withSiteLogContext<T>(context: SiteLogContext, action: () => T): T {
  return storage.run({ ...storage.getStore(), ...context }, action);
}
