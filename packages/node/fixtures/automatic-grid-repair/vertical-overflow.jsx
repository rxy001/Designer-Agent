import { Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-white text-black">
      <Section
        id="repair-demo-section"
        columns={4}
        rows={4}
        height={300}
        columnGap={8}
        rowGap={8}
        responsive={{
          tablet: { columns: 4, rows: 4, height: 300 },
          mobile: { columns: 4, rows: 4, height: 240 },
        }}
        className="border-b-4 border-[#dc2626] bg-[#f3f4f6] px-4 py-2"
      >
        <Text
          id="repair-demo-copy"
          content={
            "Automatic repair demonstration\nThis deliberately long block occupies more vertical space than its assigned Grid area.\nThe browser must measure the overflow before the deterministic repairer can safely increase the Section track size.\nAll of this content must remain meaningful after repair."
          }
          className="border-b-4 border-[#2563eb] bg-[#dbeafe] text-[18px] leading-[1.8] row-start-1 row-end-4 col-start-1 col-end-5 z-1"
        />
      </Section>
    </Root>
  );
}
