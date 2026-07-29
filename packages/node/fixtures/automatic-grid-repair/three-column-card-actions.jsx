import { Card, Root, Section } from "@/components";

const cardClassNames = {
  card: "overflow-hidden rounded-2xl border border-[#d6d3d1] bg-white p-5 shadow-sm row-start-1 row-end-4 z-1",
  "card-header": "space-y-2",
  "card-title": "text-[24px] font-semibold leading-[1.2] text-[#1c1917]",
  "card-description": "text-[15px] leading-6 text-[#57534e]",
  "card-content": "py-4 text-[15px] leading-6 text-[#292524]",
  "card-footer": "pt-4",
  "card-action": "h-12 w-full rounded-xl bg-[#1c1917] px-5 text-white",
};

export default function App() {
  return (
    <Root className="bg-[#f5f5f4] text-[#1c1917]">
      <Section
        id="card-actions-section"
        columns={6}
        rows={5}
        height={430}
        columnGap={16}
        rowGap={8}
        responsive={{
          tablet: { columns: 6, rows: 8, height: 720 },
          mobile: { columns: 6, rows: 15, height: 1200 },
        }}
        className="bg-[#f5f5f4] px-6 py-5"
      >
        <Card
          id="card-actions-starter"
          title="Starter workspace"
          description="For focused teams building their first repeatable delivery workflow."
          content="Shared planning, weekly reports, role-based access, reusable templates, and guided onboarding are included for every project."
          buttonLabel="Choose Starter"
          classNames={{
            ...cardClassNames,
            card: `${cardClassNames.card} col-start-1 col-end-3 sm:max-lg:row-start-1 sm:max-lg:row-end-7 sm:max-lg:col-start-1 sm:max-lg:col-end-3 max-sm:row-start-1 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-7`,
          }}
        />
        <Card
          id="card-actions-growth"
          title="Growth workspace"
          description="For expanding organizations coordinating several active product streams."
          content="Advanced permissions, portfolio dashboards, approval paths, automation history, and priority support keep every team aligned."
          buttonLabel="Start Growth"
          classNames={{
            ...cardClassNames,
            card: `${cardClassNames.card} col-start-3 col-end-5 sm:max-lg:row-start-1 sm:max-lg:row-end-7 sm:max-lg:col-start-3 sm:max-lg:col-end-5 max-sm:row-start-6 max-sm:row-end-10 max-sm:col-start-1 max-sm:col-end-7`,
          }}
        />
        <Card
          id="card-actions-scale"
          title="Scale workspace"
          description="For complex programs requiring governance, visibility, and dependable controls."
          content="Custom policies, audit exports, workspace analytics, dedicated environments, and launch reviews support high-stakes operations."
          buttonLabel="Contact Sales"
          classNames={{
            ...cardClassNames,
            card: `${cardClassNames.card} col-start-5 col-end-7 sm:max-lg:row-start-1 sm:max-lg:row-end-7 sm:max-lg:col-start-5 sm:max-lg:col-end-7 max-sm:row-start-11 max-sm:row-end-15 max-sm:col-start-1 max-sm:col-end-7`,
          }}
        />
      </Section>
    </Root>
  );
}
