import { Navbar, Root, Section } from "@/components";

export default function App() {
  return (
    <Root >
      <Section id="e8d1d0ce-374d-41a3-aed7-952c6553650f" columns={12} rows={1} height={72} columnGap={12} rowGap={12} responsive={{
        tablet: {
          height: 72
        },
        mobile: {
          height: 68
        }
      }} className="bg-[#faf9f5]">
        <Navbar brand="MUSE Atelier" sticky showMobileMenu classNames={{
          navbar: "border-b border-[#e6dfd8] bg-[#faf9f5] text-[#141413] row-start-1 row-end-2 col-start-1 col-end-13 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-13 sm:max-lg:z-1 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-13 max-sm:z-1",
          "navbar-inner": "mx-auto w-full max-w-6xl px-6 py-3 max-sm:px-4",
          "navbar-brand": "font-['Cormorant_Garamond',serif] text-xl font-semibold tracking-[-0.02em] text-[#141413]",
          "navbar-nav-list": "justify-center gap-1",
          "navbar-nav-item": "rounded-md px-3 py-2 text-sm font-medium text-[#6c6a64] transition-colors hover:bg-[#efe9de] hover:text-[#141413]",
          "navbar-active-nav-item": "bg-[#efe9de] text-[#141413]",
          "navbar-actions": "gap-2",
          "navbar-primary-action": "rounded-md bg-[#cc785c] px-4 py-2 text-sm font-semibold text-[#ffffff] transition-opacity hover:opacity-90",
          "navbar-secondary-action": "rounded-md px-4 py-2 text-sm font-medium text-[#141413] hover:bg-[#efe9de]",
          "navbar-mobile-toggle": "border border-[#e6dfd8] bg-[#faf9f5] text-[#141413]",
          "navbar-mobile-panel": "border-t border-[#e6dfd8] bg-[#faf9f5] px-4 py-4 shadow-lg"
        }} id="35182f7f-bf05-47b5-8609-08e92ada2157" />
      </Section>
    </Root>
  );
}
