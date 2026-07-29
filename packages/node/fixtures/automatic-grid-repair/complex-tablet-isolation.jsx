import { Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-white text-black">
      <Section
        id="tablet-isolation-section"
        columns={4}
        rows={6}
        height={520}
        columnGap={12}
        rowGap={8}
        responsive={{
          tablet: { columns: 6, rows: 6, height: 300 },
          mobile: { columns: 4, rows: 8, height: 520 },
        }}
        className="border-b-4 border-[#dc2626] bg-[#fafaf9] px-4 py-2"
      >
        <Text
          id="tablet-isolation-copy"
          content={"Responsive editorial summary with intentionally dense copy. The desktop composition has enough width and height, while the tablet composition narrows the Tool and exposes a measured vertical overflow. The mobile composition assigns additional rows so it remains valid without inheriting the tablet repair."}
          className="border-b-4 border-[#2563eb] bg-[#dbeafe] text-[18px] leading-[1.6] row-start-1 row-end-5 col-start-1 col-end-5 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-4 sm:max-lg:col-start-1 sm:max-lg:col-end-4 max-sm:row-start-1 max-sm:row-end-7 max-sm:col-start-1 max-sm:col-end-5"
        />
      </Section>
    </Root>
  );
}
