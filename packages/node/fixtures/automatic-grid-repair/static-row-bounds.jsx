import { Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-white text-black">
      <Section
        id="static-bounds-section"
        columns={4}
        rows={4}
        height={320}
        columnGap={8}
        rowGap={8}
        responsive={{
          tablet: { columns: 4, rows: 4, height: 320 },
          mobile: { columns: 4, rows: 4, height: 320 },
        }}
        className="border-b-4 border-[#dc2626] bg-[#fff7ed] px-4 py-2"
      >
        <Text
          id="static-bounds-copy"
          content="This Tool uses mobile row lines outside the declared Grid. Automatic repair should shift it upward by the minimum distance while preserving its original row span."
          className="border-b-4 border-[#ea580c] bg-[#ffedd5] text-[16px] leading-[1.5] row-start-1 row-end-3 col-start-1 col-end-5 z-1 max-sm:row-start-4 max-sm:row-end-7"
        />
      </Section>
    </Root>
  );
}
