import { Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-white text-black">
      <Section
        id="multi-tool-section"
        columns={4}
        rows={6}
        height={420}
        columnGap={12}
        rowGap={8}
        responsive={{
          tablet: { columns: 4, rows: 6, height: 420 },
          mobile: { columns: 4, rows: 6, height: 420 },
        }}
        className="border-b-4 border-[#dc2626] bg-[#f5f5f4] px-4 py-2"
      >
        <Text
          id="multi-tool-left"
          content={"Left product summary\nMaterials and finish\nDelivery schedule\nWarranty coverage\nCare instructions\nAvailable colors\nCurrent inventory\nStore pickup notes\nMember pricing"}
          className="border-b-4 border-[#2563eb] bg-[#dbeafe] text-[16px] leading-[1.5] row-start-1 row-end-4 col-start-1 col-end-3 z-1"
        />
        <Text
          id="multi-tool-right"
          content={"Right product summary\nSizing guidance\nReturn conditions\nShipping regions\nPackaging details\nSupport channels\nRestock alerts\nSeasonal offer\nMember rewards"}
          className="border-b-4 border-[#16a34a] bg-[#dcfce7] text-[16px] leading-[1.5] row-start-1 row-end-4 col-start-3 col-end-5 z-1"
        />
      </Section>
    </Root>
  );
}
