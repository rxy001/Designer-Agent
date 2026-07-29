import { Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-white text-black">
      <Section
        id="unrepairable-section"
        columns={4}
        rows={4}
        height={240}
        columnGap={8}
        rowGap={8}
        responsive={{
          tablet: { columns: 4, rows: 4, height: 240 },
          mobile: { columns: 4, rows: 4, height: 240 },
        }}
        className="bg-white px-4 py-2"
      >
        <Text
          id="unrepairable-copy"
          content="This fixed-width content intentionally exceeds the mobile viewport."
          className="w-[900px] text-[18px] leading-[1.5] row-start-1 row-end-3 col-start-1 col-end-5 z-1"
        />
      </Section>
    </Root>
  );
}
