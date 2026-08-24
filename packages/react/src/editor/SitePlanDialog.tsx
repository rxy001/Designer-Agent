import { Button } from "../ui/Button";
import type { DeliveryPolicy, PublicSitePlan } from "./types";

export function SitePlanDialog({
  plan,
  reduced = false,
  onApprove,
  onReject,
}: {
  plan: PublicSitePlan;
  reduced?: boolean;
  onApprove: (policy: DeliveryPolicy) => void;
  onReject: () => void;
}) {
  return (
    <div className="x:fixed x:inset-0 x:z-[100] x:flex x:items-center x:justify-center x:bg-black/40 x:p-6">
      <div className="x:max-h-[85vh] x:w-full x:max-w-2xl x:overflow-auto x:rounded-xl x:bg-white x:p-6 x:shadow-2xl">
        <h2 className="x:text-lg x:font-semibold">{reduced ? "Confirm reduced site plan" : "Review site plan"}</h2>
        <p className="x:mt-2 x:text-sm x:leading-6 x:text-neutral-600">{plan.siteObjective}</p>
        <div className="x:mt-5 x:space-y-2">
          {plan.pages.map((page) => (
            <div key={page.taskKey} className="x:flex x:items-start x:justify-between x:gap-4 x:rounded-lg x:border x:border-neutral-200 x:p-3">
              <div>
                <div className="x:text-sm x:font-medium">{page.title}</div>
                <div className="x:mt-1 x:text-xs x:text-neutral-500">{page.route} · {page.objective}</div>
              </div>
              <span className="x:rounded-full x:bg-neutral-100 x:px-2 x:py-1 x:text-[11px] x:font-semibold x:uppercase">{page.action}</span>
            </div>
          ))}
        </div>
        <div className="x:mt-4 x:rounded-lg x:bg-neutral-50 x:p-3 x:text-xs x:leading-5 x:text-neutral-600">
          Shared shell: {plan.shell.action}. Navigation: {plan.navigation.items.map((item) => item.label).join(", ") || "none"}.
          This plan is read-only; reject it to request a new plan.
        </div>
        <div className="x:mt-6 x:flex x:flex-wrap x:justify-end x:gap-2">
          <Button variant="ghost" onClick={onReject}>Reject</Button>
          {reduced ? (
            <Button onClick={() => onApprove("best_effort")}>Confirm reduced plan</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onApprove("best_effort")}>Approve · best effort</Button>
              <Button onClick={() => onApprove("strict")}>Approve · strict</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

