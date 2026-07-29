import { Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-white text-black">
      <Section
        id="reflow-section"
        columns={4}
        rows={7}
        height={360}
        columnGap={12}
        rowGap={8}
        responsive={{
          tablet: { columns: 4, rows: 7, height: 360 },
          mobile: { columns: 4, rows: 7, height: 360 },
        }}
        className="border-b-4 border-[#dc2626] bg-[#fafaf9] px-4 py-2"
      >
        <Text
          id="reflow-primary-copy"
          content={"Campaign overview\nAudience definition\nChannel strategy\nCreative direction\nLaunch sequence\nMeasurement plan\nRisk controls\nRegional rollout\nSupport coverage\nPost-launch review"}
          className="border-b-4 border-[#2563eb] bg-[#dbeafe] text-[16px] leading-[1.5] row-start-1 row-end-4 col-start-1 col-end-5 z-1"
        />
        <Text
          id="reflow-downstream-copy"
          content="This downstream band must move as a unit while preserving the original gap."
          className="border-b-4 border-[#16a34a] bg-[#dcfce7] text-[16px] leading-[1.5] row-start-5 row-end-7 col-start-1 col-end-5 z-1"
        />
      </Section>
    </Root>
  );
}
