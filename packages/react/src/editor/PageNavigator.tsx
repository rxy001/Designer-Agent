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
    <aside className="flex w-72 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
          <LayersIcon className="h-4 w-4" />
          Page structure
        </div>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          Sections and tools stay local until you ask AI to modify the page.
        </p>
      </div>
      <div className="border-b border-neutral-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-normal text-neutral-500">
            Pages
          </div>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onAddPage}>
            <PlusIcon className="h-3.5 w-3.5" />
            Page
          </Button>
        </div>
        <div className="space-y-1">
          {pages.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-medium",
                currentPageId === item.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-neutral-600 hover:bg-neutral-50",
              )}
              onClick={() => onSelectPage(item.id)}
            >
              <span className="min-w-0 truncate">{item.title}</span>
              <span className="ml-2 shrink-0 text-[10px] opacity-60">
                {item.sections.length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {page.sections.map((section) => (
          <div key={section.id} className="mb-3">
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium",
                selectedSectionId === section.id
                  ? "bg-neutral-950 text-white"
                  : "text-neutral-700 hover:bg-neutral-100",
              )}
              onClick={() => onSelectSection(section.id)}
            >
              <span>{section.name}</span>
              <span className="text-xs opacity-70">
                {section.grid.columns}x{section.grid.rows}
              </span>
            </button>
            <div className="mt-2 space-y-1 pl-2">
              {section.tools.map((tool) => {
                const isEditing = editingToolId === tool.id;
                const isSelected = selectedToolId === tool.id;

                if (isEditing) {
                  return (
                    <div
                      key={tool.id}
                      className="space-y-2 rounded-md border border-blue-100 bg-blue-50 p-2"
                    >
                      <Input
                        value={editingToolName}
                        className="h-8 text-xs"
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
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => saveEditingTool(tool)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
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
                      "flex w-full items-center gap-1 rounded-md px-2 py-1",
                      isSelected ? "bg-blue-50 text-blue-700" : "text-neutral-600",
                    )}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1.5 text-left text-xs hover:bg-neutral-50"
                      onClick={() => onSelectTool(tool.id)}
                    >
                      {tool.hidden ? (
                        <EyeOffIcon className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <EyeIcon className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{tool.name}</span>
                      {tool.locked ? (
                        <LockIcon className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <UnlockIcon className="h-3.5 w-3.5 shrink-0 opacity-40" />
                      )}
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
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
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-normal text-neutral-500">
            Add
          </div>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onAddSection}>
            <PlusIcon className="h-3.5 w-3.5" />
            Section
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {addableToolTypes.map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className="justify-start capitalize"
              onClick={() => onAddTool(type)}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {type}
            </Button>
          ))}
        </div>
      </div>
    </aside>
  );
}
