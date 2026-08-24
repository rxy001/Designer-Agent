import assert from "node:assert/strict";
import test from "node:test";
import { runSiteReviewerAgent } from "../app/reviewer/siteReviewerAgent.ts";
import { siteFixture } from "./siteV2Fixtures.ts";

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

test("degrades only explicit Site Reviewer infrastructure failures", async () => {
  const input = { site: siteFixture(), designContract, screenshots: [] };
  assert.equal((await runSiteReviewerAgent(input, async () => {
    throw new Error("site_reviewer_infrastructure_unavailable:browser");
  })).status, "review_unavailable");
  await assert.rejects(
    () => runSiteReviewerAgent(input, async () => { throw new Error("site_reviewer_invalid_result"); }),
    /site_reviewer_invalid_result/,
  );
});

test("forwards Designer implementation-limit declarations to Site Reviewer without validation", async () => {
  const declaration = {
    requirement: "Allow visitors to type a custom query.",
    reason: "The available components expose no text-input capability.",
    alternative: "Provide preset query actions.",
    owner: { kind: "page-body" as const, pageId: "home" },
  };
  const result = await runSiteReviewerAgent({
    site: siteFixture(),
    designContract,
    screenshots: [],
    unimplementedRequirements: [declaration],
  }, async (input) => {
    assert.deepEqual(input.unimplementedRequirements, [declaration]);
    return { status: "accepted", issues: [] };
  });

  assert.equal(result.status, "accepted");
});
