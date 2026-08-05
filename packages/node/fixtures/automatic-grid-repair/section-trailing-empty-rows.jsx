import { Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-white text-[#1c1917]">
      <Section
        id="trailing-rows-section"
        columns={4}
        rows={24}
        height={3438}
        columnGap={16}
        rowGap={10}
        responsive={{
          tablet: { columns: 4, rows: 4, height: 360 },
          mobile: { columns: 4, rows: 4, height: 360 },
        }}
        className="bg-[#f5f5f4] px-6 py-5"
      >
        <Text
          id="trailing-rows-left"
          content="Operational overview with a deliberately complete first-column composition."
          className="rounded-2xl border border-[#d6d3d1] bg-white p-6 text-[18px] leading-7 row-start-1 row-end-21 col-start-1 col-end-3 z-1 sm:max-lg:row-end-5 max-sm:row-end-5"
        />
        <Text
          id="trailing-rows-right"
          content="Delivery status with four empty trailing rows that remain below the percentage-based whitespace threshold."
          className="rounded-2xl border border-[#d6d3d1] bg-white p-6 text-[18px] leading-7 row-start-1 row-end-21 col-start-3 col-end-5 z-1 sm:max-lg:row-end-5 max-sm:row-end-5"
        />
      </Section>
    </Root>
  );
}
