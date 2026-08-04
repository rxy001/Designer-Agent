import { useState } from "react";
import {
  EyeIcon,
  EyeOffIcon,
  LayersIcon,
  LockIcon,
  PlusIcon,
  UnlockIcon,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Separator } from "../ui/Separator";
import { cn } from "../ui/cn";
import { addableToolTypes } from "./pageDocument";
import type { PageDocument, ToolNode } from "./types";

type PageNavigatorProps = {
  page: PageDocument;
  pages: PageDocument[];
  currentPageId: string;
  selectedSectionId: string;
  selectedToolId?: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onSelectSection: (sectionId: string) => void;
  onSelectTool: (toolId: string) => void;
  onAddTool: (type: ToolNode["type"]) => void;
  onAddSection: () => void;
  onRenameTool: (toolId: string, name: string) => void;
};

export function PageNavigator({
  page,
  pages,
  currentPageId,
  selectedSectionId,
  selectedToolId,
  onSelectPage,
  onAddPage,
  onSelectSection,
  onSelectTool,
  onAddTool,
  onAddSection,
  onRenameTool,
}: PageNavigatorProps) {
  const [editingToolId, setEditingToolId] = useState<string>();
  const [editingToolName, setEditingToolName] = useState("");

  const startEditingTool = (tool: ToolNode) => {
    setEditingToolId(tool.id);
    setEditingToolName(tool.name);
    onSelectTool(tool.id);
  };

  const cancelEditingTool = () => {
    setEditingToolId(undefined);
    setEditingToolName("");
  };

  const saveEditingTool = (tool: ToolNode) => {
    const nextName = editingToolName.trim();

    if (nextName && nextName !== tool.name) {
      onRenameTool(tool.id, nextName);
    }

    cancelEditingTool();
  };

  return (
    <aside className="x:flex x:w-72 x:shrink-0 x:flex-col x:border-r x:border-neutral-200 x:bg-white">
      <div className="x:border-b x:border-neutral-200 x:p-4">
        <div className="x:flex x:items-center x:gap-2 x:text-sm x:font-semibold x:text-neutral-950">
          <LayersIcon className="x:h-4 x:w-4" />
          Page structure
        </div>
        <p className="x:mt-1 x:text-xs x:leading-5 x:text-neutral-500">
          Sections and tools stay local until you ask AI to modify the page.
        </p>
      </div>
      <div className="x:border-b x:border-neutral-200 x:p-3">
        <div className="x:mb-2 x:flex x:items-center x:justify-between">
          <div className="x:text-xs x:font-semibold x:uppercase x:tracking-normal x:text-neutral-500">
            Pages
          </div>
          <Button size="sm" variant="ghost" className="x:h-7 x:px-2" onClick={onAddPage}>
            <PlusIcon className="x:h-3.5 x:w-3.5" />
            Page
          </Button>
        </div>
        <div className="x:space-y-1">
          {pages.map((item) => {
            const isCurrentPage = currentPageId === item.id;
            const isPageTarget =
              isCurrentPage && !selectedSectionId && !selectedToolId;

            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "x:flex x:w-full x:items-center x:justify-between x:rounded-md x:px-3 x:py-2 x:text-left x:text-xs x:font-medium",
                  isPageTarget
                    ? "x:bg-neutral-950 x:text-white"
                    : isCurrentPage
                      ? "x:bg-blue-50 x:text-blue-700"
                      : "x:text-neutral-600 x:hover:bg-neutral-50",
                )}
                onClick={() => onSelectPage(item.id)}
              >
                <span className="x:min-w-0 x:truncate">{item.title}</span>
                <span className="x:ml-2 x:shrink-0 x:text-[10px] x:opacity-60">
                  {item.sections.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="x:min-h-0 x:flex-1 x:overflow-auto x:p-3">
        {page.sections.map((section) => (
          <div key={section.id} className="x:mb-3">
            <button
              type="button"
              className={cn(
                "x:flex x:w-full x:items-center x:justify-between x:rounded-md x:px-3 x:py-2 x:text-left x:text-sm x:font-medium",
                selectedSectionId === section.id
                  ? "x:bg-neutral-950 x:text-white"
                  : "x:text-neutral-700 x:hover:bg-neutral-100",
              )}
              onClick={() => onSelectSection(section.id)}
            >
              <span>{section.name}</span>
              <span className="x:text-xs x:opacity-70">
                {section.grid.columns}x{section.grid.rows}
              </span>
            </button>
            <div className="x:mt-2 x:space-y-1 x:pl-2">
              {section.tools.map((tool) => {
                const isEditing = editingToolId === tool.id;
                const isSelected = selectedToolId === tool.id;

                if (isEditing) {
                  return (
                    <div
                      key={tool.id}
                      className="x:space-y-2 x:rounded-md x:border x:border-blue-100 x:bg-blue-50 x:p-2"
                    >
                      <Input
                        value={editingToolName}
                        className="x:h-8 x:text-xs"
                        autoFocus
                        onChange={(event) => setEditingToolName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            saveEditingTool(tool);
                          }

                          if (event.key === "Escape") {
                            cancelEditingTool();
                          }
                        }}
                      />
                      <div className="x:flex x:justify-end x:gap-1">
                        <Button
                          size="sm"
                          className="x:h-7 x:px-2 x:text-[11px]"
                          onClick={() => saveEditingTool(tool)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="x:h-7 x:px-2 x:text-[11px]"
                          onClick={cancelEditingTool}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={tool.id}
                    className={cn(
                      "x:flex x:w-full x:items-center x:gap-1 x:rounded-md x:px-2 x:py-1",
                      isSelected ? "x:bg-blue-50 x:text-blue-700" : "x:text-neutral-600",
                    )}
                  >
                    <button
                      type="button"
                      className="x:flex x:min-w-0 x:flex-1 x:items-center x:gap-2 x:rounded x:px-1 x:py-1.5 x:text-left x:text-xs x:hover:bg-neutral-50"
                      onClick={() => onSelectTool(tool.id)}
                    >
                      {tool.hidden ? (
                        <EyeOffIcon className="x:h-3.5 x:w-3.5 x:shrink-0" />
                      ) : (
                        <EyeIcon className="x:h-3.5 x:w-3.5 x:shrink-0" />
                      )}
                      <span className="x:min-w-0 x:flex-1 x:truncate">{tool.name}</span>
                      {tool.locked ? (
                        <LockIcon className="x:h-3.5 x:w-3.5 x:shrink-0" />
                      ) : (
                        <UnlockIcon className="x:h-3.5 x:w-3.5 x:shrink-0 x:opacity-40" />
                      )}
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="x:h-7 x:px-2 x:text-[11px]"
                      onClick={() => startEditingTool(tool)}
                    >
                      Edit
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Separator />
      <div className="x:p-3">
        <div className="x:mb-2 x:flex x:items-center x:justify-between">
          <div className="x:text-xs x:font-semibold x:uppercase x:tracking-normal x:text-neutral-500">
            Add
          </div>
          <Button size="sm" variant="ghost" className="x:h-7 x:px-2" onClick={onAddSection}>
            <PlusIcon className="x:h-3.5 x:w-3.5" />
            Section
          </Button>
        </div>
        <div className="x:grid x:grid-cols-2 x:gap-2">
          {addableToolTypes.map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className="x:justify-start x:capitalize"
              onClick={() => onAddTool(type)}
            >
              <PlusIcon className="x:h-3.5 x:w-3.5" />
              {type}
            </Button>
          ))}
        </div>
      </div>
    </aside>
  );
}
