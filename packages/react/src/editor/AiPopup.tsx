import { SendIcon, SparklesIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Popover, PopoverContent } from "../ui/Popover";
import { Textarea } from "../ui/Textarea";
import { Tabs, TabsList, TabsTrigger } from "../ui/Tabs";
import { cn } from "../ui/cn";
import type { AiMessage, AiScope, ConnectionStatus, ToolNode } from "./types";

type AiPopupProps = {
  open: boolean;
  selectedTool?: Pick<ToolNode, "id" | "name" | "type">;
  messages: AiMessage[];
  pending: boolean;
  connectionStatus: ConnectionStatus;
  onClose: () => void;
  onSend: (prompt: string, scope: AiScope) => void;
};

export function AiPopup({
  open,
  selectedTool,
  messages,
  pending,
  connectionStatus,
  onClose,
  onSend,
}: AiPopupProps) {
  const [prompt, setPrompt] = useState("");
  const [scope, setScope] = useState<AiScope>("page");

  const submit = () => {
    const nextPrompt = prompt.trim();

    if (!nextPrompt) return;

    onSend(nextPrompt, scope);
    setPrompt("");
  };

  return (
    <Popover open={open}>
      <div className="x:fixed x:bottom-24 x:right-6 x:z-50 x:w-[390px] x:max-w-[calc(100vw-2rem)]">
        <PopoverContent className="x:overflow-hidden">
          <div className="x:flex x:items-center x:justify-between x:border-b x:border-neutral-200 x:px-4 x:py-3">
            <div className="x:flex x:items-center x:gap-2">
              <div className="x:flex x:h-8 x:w-8 x:items-center x:justify-center x:rounded-md x:bg-neutral-950 x:text-white">
                <SparklesIcon className="x:h-4 x:w-4" />
              </div>
              <div>
                <div className="x:text-sm x:font-semibold x:text-neutral-950">
                  AI Editor
                </div>
                <div className="x:text-xs x:text-neutral-500">
                  {connectionStatus}
                </div>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <XIcon className="x:h-4 x:w-4" />
            </Button>
          </div>
          <div className="x:border-b x:border-neutral-200 x:px-4 x:py-3">
            <Tabs>
              <TabsList className="x:w-full">
                <TabsTrigger
                  active={scope === "selection"}
                  className="x:flex-1"
                  onClick={() => setScope("selection")}
                >
                  Selected tool
                </TabsTrigger>
                <TabsTrigger
                  active={scope === "page"}
                  className="x:flex-1"
                  onClick={() => setScope("page")}
                >
                  Whole page
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {scope === "selection" && selectedTool ? (
              <div className="x:mt-3 x:rounded-md x:border x:border-neutral-200 x:bg-neutral-50 x:px-3 x:py-2">
                <div className="x:text-[11px] x:font-medium x:uppercase x:tracking-wide x:text-neutral-500">
                  Selected Tool
                </div>
                <div className="x:mt-1 x:flex x:min-w-0 x:items-center x:justify-between x:gap-3">
                  <div className="x:min-w-0 x:truncate x:text-sm x:font-medium x:text-neutral-900">
                    {selectedTool.name}
                  </div>
                  <div className="x:shrink-0 x:rounded x:bg-white x:px-2 x:py-0.5 x:text-xs x:text-neutral-600 x:ring-1 x:ring-neutral-200">
                    {selectedTool.type}
                  </div>
                </div>
                <div className="x:mt-1 x:truncate x:text-xs x:text-neutral-500">
                  {selectedTool.id}
                </div>
              </div>
            ) : scope === "selection" ? (
              <p className="x:mt-2 x:text-xs x:text-neutral-500">
                Select a tool on the canvas to enable scoped edits.
              </p>
            ) : null}
          </div>
          <div className="x:flex x:max-h-72 x:flex-col x:gap-2 x:overflow-auto x:bg-neutral-50 x:p-4">
            {messages.length === 0 ? (
              <div className="x:rounded-md x:border x:border-dashed x:border-neutral-300 x:bg-white x:p-4 x:text-sm x:leading-6 x:text-neutral-500">
                Ask AI to rewrite the selected tool, improve the hero, or adjust
                the whole page layout.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "x:max-w-[85%] x:whitespace-pre-wrap x:break-words x:rounded-lg x:px-3 x:py-2 x:text-sm x:leading-6",
                    message.role === "user"
                      ? "x:self-end x:bg-neutral-950 x:text-white"
                      : message.role === "assistant"
                        ? "x:self-start x:bg-white x:text-neutral-800 x:shadow-sm"
                        : "x:self-start x:border x:border-red-200 x:bg-red-50 x:text-red-700",
                  )}
                >
                  {message.text}
                </div>
              ))
            )}
          </div>
          <div className="x:space-y-3 x:p-4">
            <Textarea
              value={prompt}
              placeholder={
                scope === "selection"
                  ? "Modify the selected tool..."
                  : "Modify the whole page..."
              }
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  submit();
                }
              }}
            />
            <Button
              className="x:w-full"
              disabled={pending || connectionStatus !== "connected"}
              onClick={submit}
            >
              <SendIcon className="x:h-4 x:w-4" />
              {pending ? "Thinking..." : "Send to AI"}
            </Button>
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}
