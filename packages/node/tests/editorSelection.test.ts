import assert from "node:assert/strict";
import test from "node:test";

import {
  editorSelectionToSiteEditTarget,
  getPageSelection,
  getSectionSelection,
  getToolSelection,
  reconcileEditorSelection,
} from "../../react/src/editor/selection.ts";

test("converts editor selections into explicit Site edit targets", () => {
  assert.deepEqual(editorSelectionToSiteEditTarget({ kind: "site" }), { kind: "site" });
  assert.deepEqual(editorSelectionToSiteEditTarget({ kind: "page", pageId: "home" }), { kind: "page", pageId: "home" });
  assert.deepEqual(editorSelectionToSiteEditTarget({ kind: "page-body", pageId: "home", sectionId: "hero", toolId: "headline" }), {
    kind: "tool",
    owner: { kind: "page-body", pageId: "home" },
    sectionId: "hero",
    toolId: "headline",
  });
  assert.deepEqual(editorSelectionToSiteEditTarget({ kind: "header" }), { kind: "shared-region", region: "header" });
});

test("selecting the Page clears Section and Tool targets", () => {
  assert.deepEqual(getPageSelection(), {
    selectedSectionId: "",
    selectedToolId: undefined,
  });
});

test("selecting a Section clears a Tool selected in another Section", () => {
  assert.deepEqual(getSectionSelection("footer"), {
    selectedSectionId: "footer",
    selectedToolId: undefined,
  });
});

test("selecting a Tool also selects its containing Section", () => {
  assert.deepEqual(getToolSelection(createPage(), "footer-copy"), {
    selectedSectionId: "footer",
    selectedToolId: "footer-copy",
  });
});

test("reconciles stale selection after an AI Patch removes its target", () => {
  const page = createPage();
  page.sections = page.sections.filter((section) => section.id !== "hero");

  assert.deepEqual(
    reconcileEditorSelection(page, "hero", "hero-copy"),
    {
      selectedSectionId: "footer",
      selectedToolId: undefined,
    },
  );
});

test("preserves Page selection after a whole-page AI Patch", () => {
  assert.deepEqual(reconcileEditorSelection(createPage(), "", undefined), {
    selectedSectionId: "",
    selectedToolId: undefined,
  });
});

function createPage() {
  return {
    id: "page",
    sections: [
      createSection("hero", "hero-copy"),
      createSection("footer", "footer-copy"),
    ],
  };
}

function createSection(sectionId: string, toolId: string) {
  return {
    id: sectionId,
    tools: [{ id: toolId }],
  };
}
