import assert from "node:assert/strict";
import test from "node:test";
import {
  digestValue,
  type PageDocument,
  type PublicSitePlan,
} from "@designer-agent/site-contract";
import { pageDocumentToJsx } from "../app/editor/pageDocumentToJsx.ts";
import { executeSiteDelivery } from "../app/site/executeSiteDelivery.ts";
import { buildFastCreateShell } from "../app/agent/runSiteShellWorker.ts";
import {
  runPageWorker,
  type PageWorkerAgentRunner,
  type RunPageWorkerInput,
} from "../app/agent/runPageWorker.ts";
import type { StagedPageDelivery } from "../app/agent/stagePageDelivery.ts";
import { body, section, siteFixture } from "./siteV2Fixtures.ts";

const designContract = {
  brand: { productName: "Test", visualDirection: "simple", tone: "clear" },
  sharedCopy: {},
  typographyRules: [],
  colorRules: [],
  imageryRules: [],
  responsiveRules: [],
  consistencyRules: [],
  shellRequirements: { header: [], footer: [] },
};

function planFixture(pageIds = ["home"]): PublicSitePlan {
  return {
    id: "plan",
    planDigest: "plan_digest",
    baseSiteVersion: 0,
    target: { kind: "site" },
    siteObjective: "Improve the site",
    shell: { action: "keep", requirements: [] },
    pages: pageIds.map((pageId) => ({
      taskKey: `${pageId}-task`,
      pageId,
      title: pageId === "home" ? "Home" : "About",
      route: pageId === "home" ? "/" : "/about",
      action: "modify" as const,
      objective: "Improve",
      requirements: [],
    })),
    navigation: {
      items: pageIds.map((pageId) => ({ label: pageId, targetPageId: pageId })),
    },
    designContract,
  };
}

function delivery(input: RunPageWorkerInput): StagedPageDelivery {
  const page = input.site.pages.find(
    (entry) => entry.id === input.pageId,
  )!.body;
  const source = pageDocumentToJsx(page);
  return {
    batchId: input.batchId,
    taskId: input.taskId,
    pageId: input.pageId,
    action: input.action,
    basePageVersion: input.action === "create" ? null : page.version,
    body: page,
    bodyPatch: [],
    bodySource: source,
    bodySourceDigest: digestValue(source),
    composedSource: source,
    composedSourceDigest: digestValue(source),
    verificationDigest: digestValue({ pageId: input.pageId }),
    qualityStatus: "passed",
  };
}

test("runs a targeted page repair after Site Reviewer rejection", async () => {
  let pageRuns = 0;
  let reviews = 0;
  const result = await executeSiteDelivery({
    originalSite: siteFixture(),
    plan: planFixture(),
    batchId: "batch",
    designSystemId: -1,
    deliveryPolicy: "strict",
    target: { kind: "site" },
    pageWorker: async (input) => {
      pageRuns += 1;
      return delivery(input);
    },
    siteReviewer: async () => {
      reviews += 1;
      return reviews === 1
        ? {
            status: "rejected",
            issues: [
              {
                message: "Repair home hierarchy",
                owner: { kind: "page-body", pageId: "home" },
              },
            ],
          }
        : { status: "accepted", issues: [] };
    },
  });
  assert.equal(pageRuns, 2);
  assert.equal(reviews, 2);
  assert.equal(result.siteReviewStatus, "accepted");
});

test("repairs deterministic broken links before running the Site Reviewer", async () => {
  let pageRuns = 0;
  let reviews = 0;
  const prompts: string[] = [];
  const result = await executeSiteDelivery({
    originalSite: siteFixture(),
    plan: planFixture(),
    batchId: "broken_link_repair_batch",
    designSystemId: -1,
    deliveryPolicy: "strict",
    target: { kind: "site" },
    pageWorker: async (input) => {
      pageRuns += 1;
      prompts.push(input.prompt);
      const staged = delivery(input);
      if (pageRuns > 1) {
        return { ...staged, body: body("home", [section("home_body")]) };
      }
      return {
        ...staged,
        body: body("home", [
          section("home_body", [
            {
              id: "broken_cta",
              type: "custom",
              name: "Broken CTA",
              layout: {
                gridArea: {
                  rowStart: 1,
                  columnStart: 1,
                  rowEnd: 2,
                  columnEnd: 3,
                },
                zIndex: 1,
              },
              props: { href: "/missing" },
            },
          ]),
        ]),
      };
    },
    siteReviewer: async () => {
      reviews += 1;
      return { status: "accepted", issues: [] };
    },
  });

  assert.equal(pageRuns, 2);
  assert.equal(reviews, 1);
  assert.match(
    prompts[1]!,
    /home_body\/broken_cta links to missing route \/missing/,
  );
  assert.equal(result.projection?.verification.ok, true);
});

test("skips the Site Reviewer when reviewer critique is disabled without skipping deterministic repairs", async () => {
  let pageRuns = 0;
  let reviews = 0;
  const result = await executeSiteDelivery({
    originalSite: siteFixture(),
    plan: planFixture(),
    batchId: "reviewer_disabled_batch",
    designSystemId: -1,
    deliveryPolicy: "strict",
    target: { kind: "site" },
    reviewerCritiqueEnabled: false,
    pageWorker: async (input) => {
      pageRuns += 1;
      const staged = delivery(input);
      if (pageRuns > 1) {
        return { ...staged, body: body("home", [section("home_body")]) };
      }
      return {
        ...staged,
        body: body("home", [
          section("home_body", [
            {
              id: "broken_cta",
              type: "custom",
              name: "Broken CTA",
              layout: {
                gridArea: {
                  rowStart: 1,
                  columnStart: 1,
                  rowEnd: 2,
                  columnEnd: 3,
                },
                zIndex: 1,
              },
              props: { href: "/missing" },
            },
          ]),
        ]),
      };
    },
    siteReviewer: async () => {
      reviews += 1;
      return { status: "accepted", issues: [] };
    },
  });

  assert.equal(pageRuns, 2);
  assert.equal(reviews, 0);
  assert.equal(result.projection?.verification.ok, true);
  assert.equal(result.siteReviewStatus, "review_unavailable");
});

test("routes shared and page Reviewer repairs only to their owning workers", async () => {
  let reviews = 0;
  const pagePrompts: string[] = [];
  const shellRequirements: string[][] = [];
  await executeSiteDelivery({
    originalSite: siteFixture(),
    plan: planFixture(),
    batchId: "owner_routing_batch",
    designSystemId: -1,
    deliveryPolicy: "strict",
    target: { kind: "site" },
    pageWorker: async (input) => {
      pagePrompts.push(input.prompt);
      return delivery(input);
    },
    shellWorker: async (input) => {
      shellRequirements.push(input.requirements);
      return {
        header: input.site.sharedShell.header,
        footer: input.site.sharedShell.footer,
        headerDigest: digestValue(input.site.sharedShell.header),
        footerDigest: digestValue(input.site.sharedShell.footer),
      };
    },
    siteReviewer: async () => {
      reviews += 1;
      return reviews === 1
        ? {
            status: "rejected",
            issues: [
              {
                message: "Repair shared Footer links",
                owner: { kind: "shared-region", region: "footer" },
              },
              {
                message: "Repair home Body hierarchy",
                owner: { kind: "page-body", pageId: "home" },
              },
            ],
          }
        : { status: "accepted", issues: [] };
    },
  });

  assert.deepEqual(shellRequirements, [["Repair shared Footer links"]]);
  assert.equal(pagePrompts.length, 2);
  assert.match(pagePrompts[1]!, /Repair home Body hierarchy/);
  assert.doesNotMatch(pagePrompts[1]!, /Repair shared Footer links/);
});

test("treats shared-shell findings as inherited for a page-only delivery", async () => {
  let shellRuns = 0;
  let reviewTarget: unknown;
  const result = await executeSiteDelivery({
    originalSite: siteFixture(),
    plan: planFixture(),
    batchId: "page_scope_batch",
    designSystemId: -1,
    deliveryPolicy: "strict",
    target: { kind: "page", pageId: "home" },
    pageWorker: async (input) => delivery(input),
    shellWorker: async () => {
      shellRuns += 1;
      throw new Error("shell worker must not run for inherited findings");
    },
    siteReviewer: async (input) => {
      reviewTarget = input.target;
      return {
        status: "rejected",
        issues: [
          {
            message: "Repair shared Header navigation",
            owner: { kind: "shared-region", region: "header" },
          },
        ],
      };
    },
  });

  assert.equal(result.siteReviewStatus, "accepted");
  assert.equal(shellRuns, 0);
  assert.deepEqual(reviewTarget, { kind: "page", pageId: "home" });
});

test("excludes shell requirements and Footer copy from page prompts", async () => {
  const plan = planFixture();
  plan.designContract = {
    ...plan.designContract,
    sharedCopy: {
      primaryCta: "Browse",
      footerCopy: "FOOTER_COPY_MUST_NOT_REACH_PAGE",
    },
    shellRequirements: {
      header: ["HEADER_REQUIREMENT_MUST_NOT_REACH_PAGE"],
      footer: ["FOOTER_REQUIREMENT_MUST_NOT_REACH_PAGE"],
    },
  };
  let pagePrompt = "";
  await executeSiteDelivery({
    originalSite: siteFixture(),
    plan,
    batchId: "page_contract_batch",
    designSystemId: -1,
    deliveryPolicy: "strict",
    target: { kind: "site" },
    pageWorker: async (input) => {
      pagePrompt = input.prompt;
      return delivery(input);
    },
    siteReviewer: async () => ({ status: "accepted", issues: [] }),
  });

  assert.match(pagePrompt, /Page design contract/);
  assert.match(pagePrompt, /Browse/);
  assert.doesNotMatch(pagePrompt, /HEADER_REQUIREMENT_MUST_NOT_REACH_PAGE/);
  assert.doesNotMatch(pagePrompt, /FOOTER_REQUIREMENT_MUST_NOT_REACH_PAGE/);
  assert.doesNotMatch(pagePrompt, /FOOTER_COPY_MUST_NOT_REACH_PAGE/);
});

test("does not guess a repair owner for unlocated Site Reviewer issues", async () => {
  let repairRuns = 0;
  await assert.rejects(
    executeSiteDelivery({
      originalSite: siteFixture(),
      plan: planFixture(),
      batchId: "unlocated_review_batch",
      designSystemId: -1,
      deliveryPolicy: "strict",
      target: { kind: "site" },
      pageWorker: async (input) => {
        repairRuns += 1;
        return delivery(input);
      },
      shellWorker: async () => {
        throw new Error("unlocated issue must not be routed to shell");
      },
      siteReviewer: async () => ({
        status: "rejected",
        issues: [
          {
            message: "The defect owner is unclear",
            owner: { kind: "unlocated" },
          },
        ],
      }),
    }),
    /site_reviewer_unlocated/,
  );
  assert.equal(repairRuns, 1);
});

test("forwards page Agent messages and completes todos after delivery", async () => {
  const events: Array<{
    pageId: string;
    event: import("../app/userVisibleAgentEvents.ts").UserVisibleAgentEvent;
  }> = [];
  const statuses: string[] = [];
  const result = await executeSiteDelivery({
    originalSite: siteFixture(),
    plan: planFixture(),
    batchId: "agent_events_batch",
    designSystemId: -1,
    deliveryPolicy: "strict",
    target: { kind: "site" },
    onPageStatus: (_pageId, status) => statuses.push(status),
    onPageUserEvent: (pageId, event) => events.push({ pageId, event }),
    pageWorker: async (input) => {
      input.onUserEvent?.({ type: "message", text: "正在完善首页层级" });
      input.onUserEvent?.({
        type: "todos",
        todos: [
          { name: "调整页面结构", status: "completed" },
          { name: "确定交付", status: "in_progress" },
        ],
      });
      return delivery(input);
    },
    siteReviewer: async () => ({ status: "accepted", issues: [] }),
  });

  assert.equal(result.siteReviewStatus, "accepted");
  assert.deepEqual(events, [
    { pageId: "home", event: { type: "message", text: "正在完善首页层级" } },
    {
      pageId: "home",
      event: {
        type: "todos",
        todos: [
          { name: "调整页面结构", status: "completed" },
          { name: "确定交付", status: "in_progress" },
        ],
      },
    },
    {
      pageId: "home",
      event: {
        type: "todos",
        todos: [
          { name: "调整页面结构", status: "completed" },
          { name: "确定交付", status: "completed" },
        ],
      },
    },
  ]);
  assert.deepEqual(statuses, ["generating", "verified"]);
});

test("reuses successful staged pages after best-effort reduction", async () => {
  const site = siteFixture();
  site.pages.push({
    id: "about",
    title: "About",
    route: "/about",
    artifactPath: "bodies/about.jsx",
    order: 1,
    body: body("about"),
  });
  let homeRuns = 0;
  const pageWorker = async (input: RunPageWorkerInput) => {
    if (input.pageId === "about") throw new Error("about_failed");
    homeRuns += 1;
    return delivery(input);
  };
  const first = await executeSiteDelivery({
    originalSite: site,
    plan: planFixture(["home", "about"]),
    batchId: "batch",
    designSystemId: -1,
    deliveryPolicy: "best_effort",
    target: { kind: "site" },
    pageWorker,
    siteReviewer: async () => ({ status: "accepted", issues: [] }),
  });
  assert.deepEqual(first.failedPageIds, ["about"]);
  const second = await executeSiteDelivery({
    originalSite: site,
    plan: planFixture(["home"]),
    batchId: "batch",
    designSystemId: -1,
    deliveryPolicy: "best_effort",
    target: { kind: "site" },
    pageWorker,
    resumeState: first.stagedState,
    siteReviewer: async () => ({ status: "accepted", issues: [] }),
  });
  assert.equal(homeRuns, 1);
  assert.equal(second.projection?.projectedSite.pages.length, 2);
});

test("builds a responsive creation shell without an agent run", () => {
  const site = siteFixture();
  const shell = buildFastCreateShell({
    site,
    navigation: site.navigation,
    designSystemId: 5,
    designContract: {
      ...designContract,
      brand: {
        productName: "FlowPilot",
        visualDirection: "warm",
        tone: "clear",
      },
      sharedCopy: {
        footerCopy: "Move from idea to delivery with less friction.",
      },
    },
  });

  const navbars = shell.header.sections
    .flatMap((section) => section.tools)
    .filter((tool) => tool.type === "navbar");
  assert.equal(navbars.length, 1);
  assert.equal(navbars[0]?.props.brand, "FlowPilot");
  assert.ok(navbars[0]?.layout.responsive?.tablet?.gridArea);
  assert.ok(navbars[0]?.layout.responsive?.mobile?.gridArea);
  assert.equal(navbars[0]?.props.items, undefined);
  assert.equal(shell.footer.sections[0]?.tools.length, 3);
  assert.match(
    String(shell.footer.sections[0]?.tools[1]?.props.content),
    /less friction/,
  );
  const serializedShell = JSON.stringify({
    header: shell.header,
    footer: shell.footer,
  });
  assert.doesNotMatch(serializedShell, /max-sm:/);
  assert.match(serializedShell, /@max-\[640px\]:/);
});

test("starts page workers without waiting for shared shell generation", async () => {
  const site = siteFixture();
  // This test exercises the agent-shell path. A version-0 fixture is pristine and
  // intentionally waits for the fast-create shell before starting page workers.
  site.version = 1;
  const plan = {
    ...planFixture(),
    baseSiteVersion: site.version,
    shell: { action: "modify" as const, requirements: [] },
  };
  let shellStarted = false;
  let pageStarted = false;
  let releaseShell!: () => void;
  const shellGate = new Promise<void>((resolve) => {
    releaseShell = resolve;
  });
  const shellStatuses: string[] = [];

  const execution = executeSiteDelivery({
    originalSite: site,
    plan,
    batchId: "parallel_batch",
    designSystemId: -1,
    deliveryPolicy: "strict",
    target: { kind: "site" },
    onShellStatus: (status) => shellStatuses.push(status),
    shellWorker: async () => {
      shellStarted = true;
      await shellGate;
      return {
        ...site.sharedShell,
        headerDigest: digestValue(site.sharedShell.header),
        footerDigest: digestValue(site.sharedShell.footer),
      };
    },
    pageWorker: async (input) => {
      pageStarted = true;
      return delivery(input);
    },
    siteReviewer: async () => ({ status: "accepted", issues: [] }),
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(shellStarted, true);
  assert.equal(pageStarted, true);
  releaseShell();
  const result = await execution;
  assert.ok(result.projection);
  assert.deepEqual(shellStatuses, [
    "Generating shared shell",
    "Shared shell completed",
  ]);
});

test("uses the fast shell path for a pristine one-page site", async () => {
  const site = siteFixture();
  site.pages[0]!.body.sections = [];
  site.sharedShell.footer.sections[0]!.tools = [];
  site.sharedShell.header.sections[0]!.tools[0]!.props = { brand: "Brand" };
  const plan = {
    ...planFixture(),
    shell: { action: "modify" as const, requirements: [] },
  };
  let selectedMode: "fast-create" | "agent" | undefined;
  let pageShellBrand: unknown;
  let pageFooterToolCount = 0;

  const result = await executeSiteDelivery({
    originalSite: site,
    plan,
    batchId: "fast_shell_batch",
    designSystemId: 5,
    deliveryPolicy: "strict",
    target: { kind: "site" },
    shellWorker: async (input) => {
      selectedMode = input.mode;
      return buildFastCreateShell(input);
    },
    pageWorker: async (input) => {
      pageShellBrand =
        input.site.sharedShell.header.sections[0]?.tools[0]?.props.brand;
      pageFooterToolCount =
        input.site.sharedShell.footer.sections[0]?.tools.length ?? 0;
      return delivery(input);
    },
    siteReviewer: async () => ({ status: "accepted", issues: [] }),
  });

  assert.equal(selectedMode, "fast-create");
  assert.equal(pageShellBrand, "Test");
  assert.equal(pageFooterToolCount, 3);
  assert.ok(result.projection);
  assert.equal(
    result.projection?.projectedSite.sharedShell.footer.sections[0]?.tools
      .length,
    3,
  );
});

test("uses the Apple shell palette instead of the neutral fallback", () => {
  const site = siteFixture();
  const shell = buildFastCreateShell({
    site,
    navigation: site.navigation,
    designSystemId: 4,
    designContract,
  });
  const navbarClass = String(
    shell.header.sections[0]?.tools[0]?.props.classNames &&
      (
        shell.header.sections[0]?.tools[0]?.props.classNames as Record<
          string,
          unknown
        >
      ).navbar,
  );
  assert.match(navbarClass, /#000000/);
  assert.match(navbarClass, /#ffffff/);
});

test("repairs shared shell mutations while preserving valid Body changes", async () => {
  const site = siteFixture();
  const statuses: string[] = [];
  let forwardedReviewerSetting: boolean | undefined;
  let workerPrompt = "";
  const agentRunner: PageWorkerAgentRunner = async (options) => {
    forwardedReviewerSetting = options.reviewerCritiqueEnabled;
    workerPrompt = options.prompt;
    return {
      status: "accepted",
      baseVersion: 0,
      message: "done",
      previewUrl: "",
      patch: [
        {
          op: "updateSection",
          sectionId: "footer_section",
          changes: { name: "Changed Footer" },
        },
        {
          op: "addSection",
          section: section("generated_body"),
          afterSectionId: "home_body",
        },
      ],
      qualityStatus: "passed",
    };
  };

  const result = await runPageWorker(
    {
      batchId: "boundary_batch",
      taskId: "home-task",
      site,
      pageId: "home",
      action: "modify",
      prompt: "Improve the page",
      designSystemId: -1,
      reviewerCritiqueEnabled: true,
      onProgress: (status) => statuses.push(status),
    },
    { agentRunner },
  );

  assert.deepEqual(
    result.body.sections.map((candidate) => candidate.id),
    ["home_body", "generated_body"],
  );
  assert.doesNotMatch(result.composedSource, /Changed Footer/);
  assert.match(result.composedSource, /footer_section/);
  assert.deepEqual(statuses, ["Shared header and footer preserved"]);
  assert.equal(forwardedReviewerSetting, true);
  assert.match(workerPrompt, /Existing internal routes \(the complete allowlist\): \["\/"\]/);
  assert.match(workerPrompt, /Never invent, guess, or synthesize an internal URL/);
  assert.match(workerPrompt, /omit the link property and keep the card, button, or text non-navigational/);
});

test("repairs shared shell mutations in a create replacePage delivery", async () => {
  const site = siteFixture();
  site.pages[0]!.body.sections = [];
  const candidatePage = {
    ...site.pages[0]!.body,
    sections: [
      {
        ...structuredClone(site.sharedShell.header.sections[0]!),
        name: "Changed Header",
      },
      section("generated_body"),
      structuredClone(site.sharedShell.footer.sections[0]!),
    ],
  };
  const agentRunner: PageWorkerAgentRunner = async () => ({
    status: "accepted",
    baseVersion: 0,
    message: "done",
    previewUrl: "",
    patch: [{ op: "replacePage", page: candidatePage }],
    qualityStatus: "passed",
  });

  const result = await runPageWorker(
    {
      batchId: "create_boundary_batch",
      taskId: "home-create-task",
      site,
      pageId: "home",
      action: "create",
      prompt: "Create the page",
      designSystemId: -1,
    },
    { agentRunner },
  );

  assert.deepEqual(
    result.body.sections.map((candidate) => candidate.id),
    ["generated_body"],
  );
  assert.doesNotMatch(result.composedSource, /Changed Header/);
  assert.match(result.composedSource, /header_section/);
});

test("retries page generation when a shared component appears in the Body", async () => {
  const site = siteFixture();
  const prompts: string[] = [];
  const pageSectionIds: string[][] = [];
  const reviewScopes: unknown[] = [];
  const statuses: string[] = [];
  let calls = 0;
  const agentRunner: PageWorkerAgentRunner = async (options) => {
    prompts.push(options.prompt);
    pageSectionIds.push(
      (options.page as PageDocument).sections.map((candidate) => candidate.id),
    );
    reviewScopes.push(options.reviewScope);
    calls += 1;
    return {
      status: "accepted",
      baseVersion: 0,
      message: "done",
      previewUrl: "",
      patch:
        calls === 1
          ? [
              {
                op: "addSection",
                section: section("preserved_body"),
                afterSectionId: "home_body",
              },
              {
                op: "addSection",
                section: section("body_header", [
                  {
                    id: "body_navbar",
                    type: "navbar",
                    name: "Navbar",
                    layout: {
                      gridArea: {
                        rowStart: 1,
                        columnStart: 1,
                        rowEnd: 2,
                        columnEnd: 13,
                      },
                      zIndex: 1,
                    },
                    props: {},
                  },
                ]),
                afterSectionId: "preserved_body",
              },
            ]
          : [
              { op: "removeSection", sectionId: "body_header" },
              {
                op: "addSection",
                section: section("generated_body"),
                afterSectionId: "home_body",
              },
            ],
      qualityStatus: "passed",
    };
  };

  const result = await runPageWorker(
    {
      batchId: "retry_batch",
      taskId: "home-task",
      site,
      pageId: "home",
      action: "modify",
      prompt: "Improve the page",
      designSystemId: -1,
      onProgress: (status) => statuses.push(status),
    },
    { agentRunner, boundaryRepairAttempts: 2 },
  );

  assert.equal(calls, 2);
  assert.match(prompts[0]!, /Immutable Header\/Footer Section ids/);
  assert.match(prompts[0]!, /header_section/);
  assert.match(prompts[0]!, /site_navbar/);
  assert.match(
    prompts[1]!,
    /previous candidate crossed the page Body boundary/,
  );
  assert.match(prompts[1]!, /Navbar outside the immutable Header/);
  assert.deepEqual(pageSectionIds[1], [
    "header_section",
    "home_body",
    "preserved_body",
    "body_header",
    "footer_section",
  ]);
  assert.deepEqual(reviewScopes[0], {
    kind: "page-body",
    pageId: "home",
    immutableSectionIds: ["header_section", "footer_section"],
    immutableToolIds: ["site_navbar"],
  });
  assert.deepEqual(
    result.body.sections.map((candidate) => candidate.id),
    ["home_body", "generated_body", "preserved_body"],
  );
  assert.deepEqual(statuses, [
    "Correcting page boundaries",
    "Shared header and footer preserved",
  ]);
});

test("retries an ambiguous renamed shared Footer during page creation", async () => {
  const site = siteFixture();
  site.pages[0]!.body.sections = [];
  let calls = 0;
  const agentRunner: PageWorkerAgentRunner = async () => {
    calls += 1;
    const footer = structuredClone(site.sharedShell.footer.sections[0]!);
    return {
      status: "accepted",
      baseVersion: 0,
      message: "done",
      previewUrl: "",
      patch: [
        {
          op: "replacePage",
          page: {
            ...site.pages[0]!.body,
            sections: [
              structuredClone(site.sharedShell.header.sections[0]!),
              section("generated_body"),
              ...(calls === 1
                ? [
                    {
                      ...footer,
                      id: "renamed_footer",
                      name: "Site closing region",
                    },
                  ]
                : [footer]),
            ],
          },
        },
      ],
      qualityStatus: "passed",
    };
  };

  const result = await runPageWorker(
    {
      batchId: "renamed_boundary_batch",
      taskId: "home-create-task",
      site,
      pageId: "home",
      action: "create",
      prompt: "Create the page",
      designSystemId: -1,
    },
    { agentRunner, boundaryRepairAttempts: 2 },
  );

  assert.equal(calls, 2);
  assert.deepEqual(
    result.body.sections.map((candidate) => candidate.id),
    ["generated_body"],
  );
});

test("returns a user-readable error after page boundary repair is exhausted", async () => {
  const site = siteFixture();
  let calls = 0;
  const agentRunner: PageWorkerAgentRunner = async () => {
    calls += 1;
    return {
      status: "accepted",
      baseVersion: 0,
      message: "done",
      previewUrl: "",
      patch:
        calls === 1
          ? [
              {
                op: "addSection",
                section: section("body_header", [
                  {
                    id: "body_navbar",
                    type: "navbar",
                    name: "Navbar",
                    layout: {
                      gridArea: {
                        rowStart: 1,
                        columnStart: 1,
                        rowEnd: 2,
                        columnEnd: 13,
                      },
                      zIndex: 1,
                    },
                    props: {},
                  },
                ]),
                afterSectionId: "home_body",
              },
            ]
          : [],
      qualityStatus: "passed",
    };
  };

  await assert.rejects(
    runPageWorker(
      {
        batchId: "failed_boundary_batch",
        taskId: "home-task",
        site,
        pageId: "home",
        action: "modify",
        prompt: "Improve the page",
        designSystemId: -1,
      },
      { agentRunner, boundaryRepairAttempts: 2 },
    ),
    /Page generation could not keep the shared header and footer unchanged\. Please retry\./,
  );
});
