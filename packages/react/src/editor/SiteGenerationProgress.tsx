import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleIcon,
  LoaderCircleIcon,
  WifiOffIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { cn } from "../ui/cn";
import { Button } from "../ui/Button";
import type { AiTodo, PublicSitePlan } from "./types";

export type SiteGenerationPhase =
  | "planning"
  | "awaiting_approval"
  | "generating"
  | "reconnecting";

type SiteGenerationProgressProps = {
  phase: SiteGenerationPhase;
  embedded?: boolean;
  plan?: PublicSitePlan;
  siteStatus?: string;
  shellStatus?: string;
  statuses: Record<string, string>;
  todos: Record<string, AiTodo[]>;
  onCancel: () => void;
};

const phaseCopy: Record<SiteGenerationPhase, { title: string; detail: string }> = {
  planning: {
    title: "Planning changes",
    detail: "AI is turning your request into an editable task plan.",
  },
  awaiting_approval: {
    title: "Plan ready",
    detail: "Review the plan to continue, or reject it to keep editing.",
  },
  generating: {
    title: "Generating site",
    detail: "Editing is paused while AI applies and verifies changes.",
  },
  reconnecting: {
    title: "Reconnecting",
    detail: "Generation is still protected while the connection recovers.",
  },
};

export function SiteGenerationProgress({
  phase,
  embedded = false,
  plan,
  siteStatus,
  shellStatus,
  statuses,
  todos,
  onCancel,
}: SiteGenerationProgressProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const copy = phaseCopy[phase];
  const tasks = plan?.pages ?? [];
  const includesShell = plan?.shell.action !== undefined && plan.shell.action !== "keep";
  const shellCompleted = includesShell && isCompletedStatus(shellStatus);
  const finalCompleted = isFinalCompletedStatus(siteStatus);
  const completed = tasks.filter(
    (task) => task.action === "remove" || statuses[task.pageId] === "verified",
  ).length + (shellCompleted ? 1 : 0) + (finalCompleted ? 1 : 0);
  const total = tasks.length + (includesShell ? 1 : 0) + (plan ? 1 : 0);
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const currentTask = getCurrentProgressTask({
    phase,
    plan,
    siteStatus,
    shellStatus,
    statuses,
    todos,
  });

  return (
    <aside
      aria-label="AI task progress"
      aria-live="polite"
      className={cn(
        "x:overflow-hidden x:border-neutral-200 x:bg-white",
        embedded
          ? "x:w-full x:shrink-0 x:border-y"
          : "x:fixed x:bottom-5 x:left-1/2 x:z-[60] x:w-[min(36rem,calc(100vw-2rem))] x:-translate-x-1/2 x:rounded-xl x:border x:shadow-xl",
      )}
    >
      <div className="x:flex x:min-h-12 x:items-center x:gap-2 x:px-3 x:py-2">
        <div className="x:flex x:h-7 x:w-7 x:shrink-0 x:items-center x:justify-center x:rounded-full x:bg-blue-50 x:text-blue-700">
          {phase === "reconnecting" ? (
            <WifiOffIcon className="x:h-4 x:w-4" />
          ) : phase === "awaiting_approval" ? (
            <CheckCircle2Icon className="x:h-4 x:w-4" />
          ) : (
            <LoaderCircleIcon className="x:h-4 x:w-4 x:animate-spin x:motion-reduce:animate-none" />
          )}
        </div>
        <div className="x:min-w-0 x:flex-1" aria-live="polite">
          <div className="x:truncate x:text-xs x:font-semibold x:text-neutral-900">
            {currentTask}
          </div>
        </div>
        {phase === "generating" && total > 0 ? (
          <div className="x:shrink-0 x:text-[11px] x:font-medium x:text-neutral-500">
            {completed}/{total}
          </div>
        ) : null}
        {total > 0 ? (
          <Button
            size="icon"
            variant="ghost"
            className="x:h-7 x:w-7 x:shrink-0"
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={expanded ? "Collapse task details" : "Expand task details"}
            title={expanded ? "Collapse task details" : "Expand task details"}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? (
              <ChevronUpIcon className="x:h-4 x:w-4" />
            ) : (
              <ChevronDownIcon className="x:h-4 x:w-4" />
            )}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" className="x:h-7 x:shrink-0 x:px-2 x:text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {expanded && phase === "generating" && total > 0 ? (
        <div className="x:h-1 x:bg-neutral-100">
          <div
            className="x:h-full x:bg-blue-600 x:transition-[width] x:duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {expanded && total > 0 ? (
        <div
          id={detailsId}
          className={cn(
            "x:space-y-1 x:overflow-auto x:border-t x:border-neutral-100 x:bg-neutral-50/60 x:p-3",
            embedded ? "x:max-h-40" : "x:max-h-64",
          )}
        >
          <p className="x:mb-2 x:text-xs x:leading-5 x:text-neutral-500">
            {phase === "generating" && siteStatus ? siteStatus : copy.detail}
          </p>
          {includesShell ? <ShellProgress phase={phase} status={shellStatus} /> : null}
          {tasks.map((task) => (
            <TaskProgress
              key={task.taskKey}
              title={task.title}
              action={task.action}
              phase={phase}
              status={statuses[task.pageId]}
              todos={todos[task.pageId] ?? []}
            />
          ))}
          {plan ? <FinalProgress phase={phase} status={siteStatus} /> : null}
        </div>
      ) : null}
    </aside>
  );
}

export function getCurrentProgressTask({
  phase,
  plan,
  siteStatus,
  shellStatus,
  statuses,
  todos,
}: Omit<SiteGenerationProgressProps, "embedded" | "onCancel">) {
  const copy = phaseCopy[phase];
  if (phase !== "generating") return copy.detail;

  const tasks = plan?.pages ?? [];
  for (const task of tasks) {
    const activeTodo = todos[task.pageId]?.find(
      (todo) => todo.status === "in_progress",
    );
    if (activeTodo) return `${task.title} · ${activeTodo.name}`;
  }

  for (const task of tasks) {
    const status = statuses[task.pageId];
    if (status && status !== "verified" && !status.startsWith("failed:")) {
      return `${task.title} · ${status}`;
    }
  }

  if (shellStatus && !isCompletedStatus(shellStatus)) return shellStatus;
  if (siteStatus && !isFinalCompletedStatus(siteStatus)) return siteStatus;

  const failedTask = tasks.find((task) =>
    statuses[task.pageId]?.startsWith("failed:"),
  );
  if (failedTask) return `${failedTask.title} · Failed`;

  const queuedTask = tasks.find(
    (task) => task.action !== "remove" && statuses[task.pageId] !== "verified",
  );
  if (queuedTask) return `${queuedTask.title} · Queued`;
  if (plan) return "Final review & commit";
  return copy.detail;
}

function FinalProgress({ phase, status }: { phase: SiteGenerationPhase; status?: string }) {
  const done = isFinalCompletedStatus(status);
  const working = phase === "generating" && Boolean(status) && !done;
  return (
    <div className="x:rounded-lg x:border x:border-neutral-200 x:bg-white x:px-3 x:py-2">
      <div className="x:flex x:items-center x:gap-2">
        {done ? (
          <CheckCircle2Icon className="x:h-3.5 x:w-3.5 x:shrink-0 x:text-emerald-600" />
        ) : working ? (
          <LoaderCircleIcon className="x:h-3.5 x:w-3.5 x:shrink-0 x:animate-spin x:text-blue-600 x:motion-reduce:animate-none" />
        ) : (
          <CircleIcon className="x:h-3.5 x:w-3.5 x:shrink-0 x:text-neutral-400" />
        )}
        <span className="x:min-w-0 x:flex-1 x:truncate x:text-xs x:font-medium x:text-neutral-800">
          Final review &amp; commit
        </span>
        <span className="x:max-w-52 x:truncate x:text-[11px] x:font-medium x:text-neutral-500" title={status}>
          {done ? "Completed" : status ?? (phase === "awaiting_approval" ? "Ready" : "Queued")}
        </span>
      </div>
    </div>
  );
}

function ShellProgress({ phase, status }: { phase: SiteGenerationPhase; status?: string }) {
  const failed = status?.startsWith("Shared shell failed:") ?? false;
  const done = isCompletedStatus(status);
  const working = phase === "generating" && Boolean(status) && !done && !failed;
  return (
    <div className="x:rounded-lg x:border x:border-neutral-200 x:bg-white x:px-3 x:py-2">
      <div className="x:flex x:items-center x:gap-2">
        {done ? (
          <CheckCircle2Icon className="x:h-3.5 x:w-3.5 x:shrink-0 x:text-emerald-600" />
        ) : working ? (
          <LoaderCircleIcon className="x:h-3.5 x:w-3.5 x:shrink-0 x:animate-spin x:text-blue-600 x:motion-reduce:animate-none" />
        ) : (
          <CircleIcon className={cn("x:h-3.5 x:w-3.5 x:shrink-0", failed ? "x:text-red-600" : "x:text-neutral-400")} />
        )}
        <span className="x:min-w-0 x:flex-1 x:truncate x:text-xs x:font-medium x:text-neutral-800">
          Shared Header &amp; Footer
        </span>
        <span className={cn("x:max-w-52 x:truncate x:text-[11px] x:font-medium", failed ? "x:text-red-600" : "x:text-neutral-500")} title={status}>
          {status ?? (phase === "awaiting_approval" ? "Ready" : "Queued")}
        </span>
      </div>
    </div>
  );
}

function isCompletedStatus(status?: string) {
  return status === "Shared shell completed"
    || status === "Shared shell ready"
    || status === "Existing shared shell preserved"
    || status === "Shared shell timed out · existing shell preserved";
}

function isFinalCompletedStatus(status?: string) {
  return status === "Site update ready" || status === "Site committed";
}

function TaskProgress({
  title,
  action,
  phase,
  status,
  todos,
}: {
  title: string;
  action: "create" | "modify" | "remove";
  phase: SiteGenerationPhase;
  status?: string;
  todos: AiTodo[];
}) {
  const failed = status?.startsWith("failed:") ?? false;
  const done = status === "verified" || (phase === "generating" && action === "remove");
  const working = phase === "generating" && Boolean(status) && !done && !failed;
  const label = failed
    ? "Failed"
    : done
      ? "Completed"
      : working
        ? "In progress"
        : phase === "awaiting_approval"
          ? "Ready"
          : "Queued";

  return (
    <div className="x:rounded-lg x:border x:border-neutral-200 x:bg-white x:px-3 x:py-2">
      <div className="x:flex x:items-center x:gap-2">
        {done ? (
          <CheckCircle2Icon className="x:h-3.5 x:w-3.5 x:shrink-0 x:text-emerald-600" />
        ) : working ? (
          <LoaderCircleIcon className="x:h-3.5 x:w-3.5 x:shrink-0 x:animate-spin x:text-blue-600 x:motion-reduce:animate-none" />
        ) : (
          <CircleIcon className={cn("x:h-3.5 x:w-3.5 x:shrink-0", failed ? "x:text-red-600" : "x:text-neutral-400")} />
        )}
        <span className="x:min-w-0 x:flex-1 x:truncate x:text-xs x:font-medium x:text-neutral-800">
          {title}
        </span>
        <span className={cn("x:text-[11px] x:font-medium", failed ? "x:text-red-600" : "x:text-neutral-500")}>
          {label}
        </span>
      </div>
      {todos.length > 0 ? (
        <div className="x:mt-2 x:space-y-1 x:border-t x:border-neutral-100 x:pt-2">
          {todos.map((todo, index) => (
            <div key={`${index}-${todo.name}`} className="x:flex x:items-start x:gap-2 x:text-[11px] x:leading-4">
              {todo.status === "completed" ? (
                <CheckCircle2Icon className="x:mt-px x:h-3 x:w-3 x:shrink-0 x:text-emerald-600" />
              ) : todo.status === "in_progress" ? (
                <LoaderCircleIcon className="x:mt-px x:h-3 x:w-3 x:shrink-0 x:animate-spin x:text-blue-600 x:motion-reduce:animate-none" />
              ) : (
                <CircleIcon className="x:mt-px x:h-3 x:w-3 x:shrink-0 x:text-neutral-400" />
              )}
              <span className={cn(todo.status === "completed" ? "x:text-neutral-400 x:line-through" : "x:text-neutral-600")}>
                {todo.name}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {failed ? (
        <p className="x:mt-1 x:truncate x:text-[11px] x:text-red-600" title={status}>
          {status?.slice("failed:".length).trim()}
        </p>
      ) : null}
    </div>
  );
}
