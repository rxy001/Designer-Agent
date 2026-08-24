import { Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root >
      <Section id="caa14a73-db77-42c6-af25-eeee5f3432e0" columns={12} rows={4} height={260} columnGap={12} rowGap={12} responsive={{
        tablet: {
          rows: 4,
          height: 260
        },
        mobile: {
          columns: 4,
          rows: 7,
          height: 360,
          columnGap: 10,
          rowGap: 10
        }
      }} className="border-t border-[#2a2824] bg-[#181715] px-6 py-8 max-sm:px-4">
        <Text content="MUSE Atelier" className="font-['Cormorant_Garamond',serif] self-end text-3xl font-semibold tracking-[-0.03em] text-[#faf9f5] max-sm:text-2xl row-start-1 row-end-3 col-start-1 col-end-7 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-7 sm:max-lg:z-1 max-sm:row-start-1 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5 max-sm:z-1" id="caa14a73-db77-42c6-af25-eeee5f3432e0_brand" />
        <Text content="© MUSE Atelier. All rights reserved." className="max-w-xl text-sm leading-6 text-[#a09d96] row-start-3 row-end-5 col-start-1 col-end-7 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-5 sm:max-lg:col-start-1 sm:max-lg:col-end-8 sm:max-lg:z-1 max-sm:row-start-3 max-sm:row-end-6 max-sm:col-start-1 max-sm:col-end-5 max-sm:z-1" id="caa14a73-db77-42c6-af25-eeee5f3432e0_summary" />
        <Text content="首页  ·  商品详情" className="self-center text-right text-sm font-medium leading-7 text-[#faf9f5] max-sm:text-left row-start-1 row-end-4 col-start-9 col-end-13 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-4 sm:max-lg:col-start-9 sm:max-lg:col-end-13 sm:max-lg:z-1 max-sm:row-start-6 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5 max-sm:z-1" id="caa14a73-db77-42c6-af25-eeee5f3432e0_navigation" />
      </Section>
    </Root>
  );
}
