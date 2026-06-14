import { SendIcon, SparklesIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Popover, PopoverContent } from "../ui/Popover";
import { Textarea } from "../ui/Textarea";
import { Tabs, TabsList, TabsTrigger } from "../ui/Tabs";
import { cn } from "../ui/cn";
import type { AiMessage, AiScope, ConnectionStatus } from "./types";

type AiPopupProps = {
  open: boolean;
  selectedToolId?: string;
  messages: AiMessage[];
  pending: boolean;
  connectionStatus: ConnectionStatus;
  onClose: () => void;
  onSend: (prompt: string, scope: AiScope) => void;
};

export function AiPopup({
  open,
  selectedToolId,
  messages,
  pending,
  connectionStatus,
  onClose,
  onSend,
}: AiPopupProps) {
  const [prompt, setPrompt] = useState("");
  const [scope, setScope] = useState<AiScope>("page");
  const activeScope = selectedToolId ? scope : "page";

  const submit = () => {
    const nextPrompt = prompt.trim();

    if (!nextPrompt) return;

    onSend(nextPrompt, activeScope);
    setPrompt("");
  };

  return (
    <Popover open={open}>
      <div className="fixed bottom-24 right-6 z-50 w-[390px] max-w-[calc(100vw-2rem)]">
        <PopoverContent className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-950 text-white">
                <SparklesIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-950">
                  AI Editor
                </div>
                <div className="text-xs text-neutral-500">
                  {connectionStatus}
                </div>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="border-b border-neutral-200 px-4 py-3">
            <Tabs>
              <TabsList className="w-full">
                <TabsTrigger
                  active={scope === "selection"}
                  disabled={!selectedToolId}
                  className="flex-1 disabled:opacity-40"
                  onClick={() => selectedToolId && setScope("selection")}
                >
                  Selected tool
                </TabsTrigger>
                <TabsTrigger
                  active={activeScope === "page"}
                  className="flex-1"
                  onClick={() => setScope("page")}
                >
                  Whole page
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {!selectedToolId && (
              <p className="mt-2 text-xs text-neutral-500">
                Select a tool to ask AI for scoped edits.
              </p>
            )}
          </div>
          <div className="flex max-h-72 flex-col gap-2 overflow-auto bg-neutral-50 p-4">
            {messages.length === 0 ? (
              <div className="rounded-md border border-dashed border-neutral-300 bg-white p-4 text-sm leading-6 text-neutral-500">
                Ask AI to rewrite the selected tool, improve the hero, or adjust
                the whole page layout.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6",
                    message.role === "user"
                      ? "self-end bg-neutral-950 text-white"
                      : message.role === "assistant"
                        ? "self-start bg-white text-neutral-800 shadow-sm"
                        : "self-start border border-red-200 bg-red-50 text-red-700",
                  )}
                >
                  {message.text}
                </div>
              ))
            )}
          </div>
          <div className="space-y-3 p-4">
            <Textarea
              value={prompt}
              placeholder={
                activeScope === "selection"
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
              className="w-full"
              disabled={pending || connectionStatus !== "connected"}
              onClick={submit}
            >
              <SendIcon className="h-4 w-4" />
              {pending ? "Thinking..." : "Send to AI"}
            </Button>
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}
