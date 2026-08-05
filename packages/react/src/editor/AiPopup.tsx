import {
  BotMessageSquareIcon,
  CheckCircle2Icon,
  CircleIcon,
  CircleDotIcon,
  LoaderCircleIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Popover, PopoverContent } from "../ui/Popover";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { cn } from "../ui/cn";
import type {
  AiMessage,
  ConnectionStatus,
  DesignSystemOption,
  SectionNode,
  ToolNode,
} from "./types";

type AiPopupProps = {
  open: boolean;
  pageTitle: string;
  creating: boolean;
  selectedTool?: Pick<ToolNode, "id" | "name" | "type">;
  selectedSection?: Pick<SectionNode, "id" | "name">;
  messages: AiMessage[];
  pending: boolean;
  connectionStatus: ConnectionStatus;
  designSystemId: number;
  designSystemOptions: DesignSystemOption[];
  onClose: () => void;
  onDesignSystemChange: (id: number) => void;
  onSend: (prompt: string) => void;
};

export function AiPopup({
  open,
  pageTitle,
  creating,
  selectedTool,
  selectedSection,
  messages,
  pending,
  connectionStatus,
  designSystemId,
  designSystemOptions,
  onClose,
  onDesignSystemChange,
  onSend,
}: AiPopupProps) {
  const [prompt, setPrompt] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const selectedDesignSystem =
    designSystemOptions.find((option) => option.id === designSystemId) ??
    designSystemOptions[0];
  const connected = connectionStatus === "connected";
  const latestMessage = messages.at(-1);
  const latestTodoState = latestMessage?.todos
    ?.map((todo) => `${todo.status}:${todo.name}`)
    .join("|");
  const targetLabel = selectedTool
    ? `Tool · ${selectedTool.name}`
    : selectedSection
      ? `Section · ${selectedSection.name}`
      : `${creating ? "Create" : "Page"} · ${pageTitle}`;

  useLayoutEffect(() => {
    if (!open) return;

    const el = messagesRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }, [
    open,
    messages.length,
    latestMessage?.id,
    latestMessage?.text,
    latestTodoState,
  ]);

  const submit = () => {
    const nextPrompt = prompt.trim();

    if (!nextPrompt) return;

    onSend(nextPrompt);
    setPrompt("");
  };

  return (
    <Popover open={open}>
      <div className="x:fixed x:bottom-24 x:right-6 x:z-50 x:w-[440px] x:max-w-[calc(100vw-2rem)]">
        <PopoverContent className="x:flex x:max-h-[min(760px,calc(100vh-8rem))] x:min-h-[560px] x:overflow-hidden">
          <div className="x:flex x:min-h-0 x:w-full x:flex-col">
            <div className="x:flex x:items-start x:justify-between x:border-b x:border-neutral-200 x:bg-white x:px-4 x:py-3">
              <div className="x:flex x:min-w-0 x:items-center x:gap-3">
                <div className="x:flex x:h-9 x:w-9 x:items-center x:justify-center x:rounded-lg x:bg-neutral-950 x:text-white x:shadow-sm">
                  <SparklesIcon className="x:h-4 x:w-4" />
                </div>
                <div className="x:min-w-0">
                  <div className="x:flex x:items-center x:gap-2">
                    <div className="x:text-sm x:font-semibold x:text-neutral-950">
                      AI Editor
                    </div>
                    <div
                      className={cn(
                        "x:flex x:items-center x:gap-1 x:rounded-full x:px-2 x:py-0.5 x:text-[11px] x:font-medium",
                        connected
                          ? "x:bg-emerald-50 x:text-emerald-700"
                          : "x:bg-neutral-100 x:text-neutral-500",
                      )}
                    >
                      <CircleDotIcon className="x:h-3 x:w-3" />
                      {connectionStatus}
                    </div>
                  </div>
                  <div className="x:mt-0.5 x:truncate x:text-xs x:text-neutral-500">
                    {selectedDesignSystem
                      ? `Using ${selectedDesignSystem.title}`
                      : "Choose a design system before sending."}
                  </div>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={onClose}>
                <XIcon className="x:h-4 x:w-4" />
              </Button>
            </div>

            <div className="x:border-b x:border-neutral-200 x:bg-neutral-50/70 x:px-4 x:py-3">
              <div className="x:grid x:grid-cols-1 x:gap-3">
                <label className="x:space-y-1.5">
                  <span className="x:text-xs x:font-medium x:text-neutral-600">
                    Design System
                  </span>
                  <Select
                    aria-label="Design system"
                    value={designSystemId}
                    onChange={(event) =>
                      onDesignSystemChange(Number(event.target.value))
                    }
                  >
                    {designSystemOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                  </Select>
                </label>

              </div>

              <div className="x:mt-3 x:flex x:items-center x:gap-3 x:rounded-md x:border x:border-neutral-200 x:bg-white x:px-3 x:py-2 x:shadow-sm">
                <div className="x:flex x:h-8 x:w-8 x:items-center x:justify-center x:rounded-md x:bg-neutral-100 x:text-neutral-700">
                  <CheckCircle2Icon className="x:h-4 x:w-4" />
                </div>
                <div className="x:min-w-0 x:flex-1">
                  <div className="x:text-[11px] x:font-medium x:uppercase x:tracking-wide x:text-neutral-500">
                    Current target
                  </div>
                  <div className="x:truncate x:text-sm x:font-medium x:text-neutral-900">
                    {targetLabel}
                  </div>
                </div>
              </div>
            </div>

            <div
              ref={messagesRef}
              className="x:flex x:min-h-0 x:flex-1 x:flex-col x:gap-2 x:overflow-auto x:bg-white x:p-4"
            >
              {messages.length === 0 ? (
                <div className="x:flex x:h-full x:min-h-48 x:flex-col x:items-center x:justify-center x:rounded-lg x:border x:border-dashed x:border-neutral-300 x:bg-neutral-50 x:px-5 x:py-8 x:text-center">
                  <div className="x:flex x:h-10 x:w-10 x:items-center x:justify-center x:rounded-lg x:bg-white x:text-neutral-900 x:shadow-sm x:ring-1 x:ring-neutral-200">
                    <BotMessageSquareIcon className="x:h-5 x:w-5" />
                  </div>
                  <div className="x:mt-3 x:text-sm x:font-medium x:text-neutral-950">
                    Start with a concrete edit
                  </div>
                  <p className="x:mt-1 x:max-w-72 x:text-sm x:leading-6 x:text-neutral-500">
                    Ask AI to refine copy, change layout, restyle a section, or
                    generate a complete page pass with the selected design
                    system.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "x:max-w-[88%] x:whitespace-pre-wrap x:break-words x:rounded-lg x:px-3 x:py-2 x:text-sm x:leading-6",
                      message.role === "user"
                        ? "x:self-end x:bg-neutral-950 x:text-white x:shadow-sm"
                        : message.role === "assistant"
                          ? "x:self-start x:border x:border-neutral-200 x:bg-neutral-50 x:text-neutral-800"
                          : "x:self-start x:border x:border-red-200 x:bg-red-50 x:text-red-700",
                    )}
                  >
                    {message.role === "assistant" &&
                    message.todos &&
                    message.todos.length > 0 ? (
                      <div
                        aria-label="任务进度"
                        aria-live="polite"
                        className={cn(message.text && "x:mb-2")}
                      >
                        <div className="x:mb-1.5 x:text-xs x:font-semibold x:text-neutral-900">
                          任务进度
                        </div>
                        <div className="x:space-y-1.5">
                          {message.todos.map((todo, index) => (
                            <div
                              key={`${index}-${todo.name}`}
                              className="x:flex x:items-start x:gap-2 x:text-xs x:leading-5"
                            >
                              {todo.status === "completed" ? (
                                <CheckCircle2Icon className="x:mt-0.5 x:h-3.5 x:w-3.5 x:shrink-0 x:text-emerald-600" />
                              ) : todo.status === "in_progress" ? (
                                <LoaderCircleIcon className="x:mt-0.5 x:h-3.5 x:w-3.5 x:shrink-0 x:animate-spin x:text-blue-600 x:motion-reduce:animate-none" />
                              ) : (
                                <CircleIcon className="x:mt-0.5 x:h-3.5 x:w-3.5 x:shrink-0 x:text-neutral-400" />
                              )}
                              <span
                                className={cn(
                                  todo.status === "completed"
                                    ? "x:text-neutral-500 x:line-through"
                                    : "x:text-neutral-700",
                                )}
                              >
                                {todo.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {message.text ? <div>{message.text}</div> : null}
                  </div>
                ))
              )}
            </div>

            <div className="x:border-t x:border-neutral-200 x:bg-white x:p-4">
              <Textarea
                className="x:min-h-24"
                value={prompt}
                placeholder={
                  selectedTool
                    ? "Describe how to modify the selected tool..."
                    : selectedSection
                      ? "Describe how to modify the selected section..."
                      : creating
                        ? "Describe the page you want to create..."
                        : "Describe the page change you want..."
                }
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    submit();
                  }
                }}
              />
              <div className="x:mt-3 x:flex x:items-center x:justify-between x:gap-3">
                <div className="x:text-xs x:text-neutral-500">
                  {pending
                    ? "AI is applying changes..."
                    : "Press Cmd+Enter to send"}
                </div>
                <Button
                  disabled={pending || !connected}
                  onClick={submit}
                >
                  <SendIcon className="x:h-4 x:w-4" />
                  {pending ? "Thinking..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}
