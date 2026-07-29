import { Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-white text-[#1c1917]">
      <Section
        id="intentional-space-section"
        columns={4}
        rows={8}
        height={640}
        columnGap={16}
        rowGap={8}
        responsive={{
          tablet: { columns: 4, rows: 8, height: 640 },
          mobile: { columns: 4, rows: 8, height: 640 },
        }}
        className="min-h-screen bg-[#0c0a09] px-6 py-5 text-white"
      >
        <Text
          id="intentional-space-title"
          content="A full-screen editorial stage"
          className="text-[48px] font-semibold leading-[1.05] row-start-1 row-end-3 col-start-1 col-end-3 z-1"
        />
        <Text
          id="intentional-space-copy"
          content="The open lower field is intentional and must not be compacted automatically."
          className="text-[18px] leading-7 row-start-1 row-end-3 col-start-3 col-end-5 z-1"
        />
      </Section>
    </Root>
  );
}
