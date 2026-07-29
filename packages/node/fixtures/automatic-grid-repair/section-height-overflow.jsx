import { Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-white text-black">
      <Section
        id="section-height-section"
        columns={4}
        rows={4}
        height={360}
        columnGap={8}
        rowGap={8}
        responsive={{
          tablet: { columns: 4, rows: 4, height: 360 },
          mobile: { columns: 4, rows: 4, height: 260 },
        }}
        className="border-b-4 border-[#dc2626] bg-[#f8fafc] px-4 py-2"
      >
        <Text
          id="section-height-copy"
          content="The Tool itself fits, but its painted box exceeds the mobile Section boundary. The repair must preserve its Grid coordinates and grow the Section tracks."
          className="border-b-4 border-[#2563eb] bg-[#dbeafe] text-[16px] leading-[1.5] row-start-1 row-end-4 col-start-1 col-end-5 z-1 max-sm:relative max-sm:top-[84px]"
        />
      </Section>
    </Root>
  );
}
