import { Accordion, Button, Card, Carousel, Divider, Image, Navbar, Root, Section, Text } from "@/components";

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
        }} brandHref="/" items={[
          {
            label: "首页",
            href: "/",
            active: false
          },
          {
            label: "商品详情",
            href: "/products/atelier-drape-dress",
            active: true
          }
        ]} id="35182f7f-bf05-47b5-8609-08e92ada2157" />
      </Section>

      <Section id="atelier-product-hero" columns={12} rows={12} height={900} columnGap={24} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 12,
          height: 900,
          columnGap: 18
        },
        mobile: {
          columns: 4,
          rows: 22,
          height: 1420,
          columnGap: 10,
          rowGap: 10
        }
      }} className="mx-auto w-full max-w-7xl px-8 py-8 max-sm:px-4 max-sm:py-5">
        <Text content="首页  /  女装  /  Atelier Draped Dress" className="text-xs tracking-[0.08em] text-[#8e8b82] row-start-1 row-end-2 col-start-1 col-end-13 z-1 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="atelier-breadcrumb" />
        <Carousel items={[
          {
            imgSrc: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1100&q=85",
            imgAlt: "Atelier Draped Dress in ivory, styled in natural light"
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1100&q=85",
            imgAlt: "Close view of the dress drape and soft fabric"
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=85",
            imgAlt: "Side view of the Atelier Draped Dress silhouette"
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1506629905607-d9d7f2c93c2d?auto=format&fit=crop&w=1100&q=85",
            imgAlt: "Detail of the Atelier Draped Dress neckline"
          }
        ]} classNames={{
          carousel: "h-full overflow-hidden rounded-xl bg-[#efe9de] row-start-2 row-end-11 col-start-1 col-end-8 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-11 sm:max-lg:col-start-1 sm:max-lg:col-end-8 max-sm:row-start-2 max-sm:row-end-10 max-sm:col-start-1 max-sm:col-end-5",
          "carousel-content": "h-full",
          "carousel-previous": "left-4 top-1/2 size-10 -translate-y-1/2 bg-[#faf9f5]/90 text-[#252523] shadow-sm transition-transform hover:scale-105",
          "carousel-next": "right-4 top-1/2 size-10 -translate-y-1/2 bg-[#faf9f5]/90 text-[#252523] shadow-sm transition-transform hover:scale-105",
          "carousel-item": "relative h-full",
          "carousel-item-img": "h-full w-full object-cover"
        }} id="atelier-image-gallery" />
        <Image src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=220&q=80" alt="Thumbnail of Atelier Draped Dress full look" className="h-20 w-16 rounded-md object-cover ring-1 ring-[#252523] row-start-11 row-end-13 col-start-1 col-end-2 z-1 max-sm:row-start-10 max-sm:row-end-12 max-sm:col-start-1 max-sm:col-end-2" id="atelier-thumb-full" />
        <Image src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=220&q=80" alt="Thumbnail of Atelier Draped Dress fabric detail" className="h-20 w-16 rounded-md object-cover opacity-70 transition-opacity hover:opacity-100 row-start-11 row-end-13 col-start-2 col-end-3 z-1 max-sm:row-start-10 max-sm:row-end-12 max-sm:col-start-2 max-sm:col-end-3" id="atelier-thumb-detail" />
        <Image src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=220&q=80" alt="Thumbnail of Atelier Draped Dress side silhouette" className="h-20 w-16 rounded-md object-cover opacity-70 transition-opacity hover:opacity-100 row-start-11 row-end-13 col-start-3 col-end-4 z-1 max-sm:row-start-10 max-sm:row-end-12 max-sm:col-start-3 max-sm:col-end-4" id="atelier-thumb-side" />
        <Button label="放大查看" startIcon="Search" className="justify-self-end self-center border-b border-[#252523] pb-1 text-sm text-[#252523] transition-colors hover:text-[#8b6959] row-start-11 row-end-13 col-start-6 col-end-8 z-1 max-sm:row-start-10 max-sm:row-end-12 max-sm:col-start-3 max-sm:col-end-5" id="atelier-zoom-button" />
        <Text content="MUSE Atelier / AW24" className="text-xs font-medium tracking-[0.16em] text-[#8e8b82] row-start-2 row-end-3 col-start-8 col-end-13 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-12 max-sm:row-end-13 max-sm:col-start-1 max-sm:col-end-5" id="atelier-product-eyebrow" />
        <Text content="Atelier Draped Dress" className="font-['Cormorant_Garamond',serif] text-[48px] leading-[1.02] tracking-[-0.03em] text-[#141413] sm:max-lg:text-[42px] max-sm:text-[38px] row-start-3 row-end-5 col-start-8 col-end-13 z-1 max-sm:row-start-13 max-sm:row-end-15 max-sm:col-start-1 max-sm:col-end-5" id="atelier-product-name" />
        <Text content="¥1,890" className="font-['Cormorant_Garamond',serif] text-3xl tracking-[-0.02em] text-[#252523] row-start-5 row-end-6 col-start-8 col-end-10 z-1 max-sm:row-start-15 max-sm:row-end-16 max-sm:col-start-1 max-sm:col-end-3" id="atelier-product-price" />
        <Button ariaLabel="收藏 Atelier Draped Dress" startIcon="Heart" className="justify-self-end self-center border border-[#e6dfd8] px-4 py-3 text-sm text-[#252523] transition-colors hover:border-[#8e8b82] hover:bg-[#efe9de] row-start-5 row-end-6 col-start-11 col-end-13 z-1 max-sm:row-start-15 max-sm:row-end-16 max-sm:col-start-3 max-sm:col-end-5" id="atelier-wishlist" />
        <Divider orientation="horizontal" className="border-[#e6dfd8] row-start-6 row-end-7 col-start-8 col-end-13 z-1 max-sm:row-start-16 max-sm:row-end-17 max-sm:col-start-1 max-sm:col-end-5" id="atelier-divider-top" />
        <Text content="颜色  Ivory" className="text-sm leading-6 text-[#3d3d3a] row-start-7 row-end-8 col-start-8 col-end-13 z-1 max-sm:row-start-17 max-sm:row-end-18 max-sm:col-start-1 max-sm:col-end-5" id="atelier-color" />
        <Text content="尺码" className="text-sm font-medium text-[#252523] row-start-8 row-end-9 col-start-8 col-end-10 z-1 max-sm:row-start-18 max-sm:row-end-19 max-sm:col-start-1 max-sm:col-end-3" id="atelier-size-label" />
        <Button label="XS" className="border border-[#252523] px-4 py-2 text-sm text-[#252523] row-start-9 row-end-10 col-start-8 col-end-9 z-1 max-sm:row-start-19 max-sm:row-end-20 max-sm:col-start-1 max-sm:col-end-2" id="atelier-size-xs" />
        <Button label="S" className="border border-[#e6dfd8] px-4 py-2 text-sm text-[#6c6a64] transition-colors hover:border-[#252523] row-start-9 row-end-10 col-start-9 col-end-10 z-1 max-sm:row-start-19 max-sm:row-end-20 max-sm:col-start-2 max-sm:col-end-3" id="atelier-size-s" />
        <Button label="M" className="border border-[#e6dfd8] px-4 py-2 text-sm text-[#6c6a64] transition-colors hover:border-[#252523] row-start-9 row-end-10 col-start-10 col-end-11 z-1 max-sm:row-start-19 max-sm:row-end-20 max-sm:col-start-3 max-sm:col-end-4" id="atelier-size-m" />
        <Text content="L" className="self-center text-center text-sm text-[#b4afa5] row-start-9 row-end-10 col-start-11 col-end-12 z-1 max-sm:row-start-19 max-sm:row-end-20 max-sm:col-start-4 max-sm:col-end-5" id="atelier-size-l" />
        <Text content="有现货  ·  预计 2–4 个工作日内发货" className="text-sm leading-6 text-[#5e735d] row-start-10 row-end-11 col-start-8 col-end-13 z-1 max-sm:row-start-20 max-sm:row-end-21 max-sm:col-start-1 max-sm:col-end-5" id="atelier-stock" />
        <Text content="数量" className="self-center text-sm font-medium text-[#252523] row-start-11 row-end-12 col-start-8 col-end-9 z-1 max-sm:row-start-21 max-sm:row-end-22 max-sm:col-start-1 max-sm:col-end-2" id="atelier-quantity-label" />
        <Button label="−  1  +" className="justify-self-start border border-[#e6dfd8] px-4 py-2 text-sm text-[#252523] row-start-11 row-end-12 col-start-9 col-end-11 z-1 max-sm:row-start-21 max-sm:row-end-22 max-sm:col-start-2 max-sm:col-end-4" id="atelier-quantity" />
        <Button label="加入购物袋" endIcon="ShoppingBag" className="w-full rounded-md bg-[#252523] px-5 py-4 text-sm font-medium text-[#faf9f5] transition-[background-color,transform] duration-200 hover:bg-[#6c625b] hover:-translate-y-0.5 row-start-12 row-end-13 col-start-8 col-end-13 z-1 max-sm:row-start-22 max-sm:row-end-23 max-sm:col-start-1 max-sm:col-end-5" id="atelier-add-to-bag" />
      </Section>

      <Section id="atelier-product-information" columns={12} rows={5} height={420} columnGap={24} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 5,
          height: 420,
          columnGap: 18
        },
        mobile: {
          columns: 4,
          rows: 7,
          height: 620,
          columnGap: 10,
          rowGap: 10
        }
      }} className="mx-auto w-full max-w-7xl border-t border-[#e6dfd8] px-8 py-12 max-sm:px-4 max-sm:py-10">
        <Text content="关于这件作品" className="font-['Cormorant_Garamond',serif] text-[36px] leading-tight tracking-[-0.02em] text-[#141413] max-sm:text-[30px] row-start-1 row-end-3 col-start-1 col-end-5 z-1 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="atelier-info-title" />
        <Accordion items={[
          {
            key: "description",
            title: "商品描述",
            content: "轻盈垂坠的 Atelier Draped Dress 以柔和褶裥勾勒身体线条。可调节肩带与不对称裙摆，让日常造型在克制之间保留一份流动感。"
          },
          {
            key: "fabric",
            title: "面料与护理",
            content: "主面料为 72% 莱赛尔纤维与 28% 亚麻。建议冷水轻柔手洗，反面悬挂晾干，低温熨烫以保持面料自然纹理。"
          },
          {
            key: "delivery",
            title: "配送与退换",
            content: "全场满 ¥499 顺丰包邮。签收后 7 日内可申请退换，试穿时请保持吊牌与包装完整；定制及使用过的商品除外。"
          }
        ]} multiple classNames={{
          accordion: "divide-y divide-[#e6dfd8] border-t border-[#e6dfd8] row-start-1 row-end-6 col-start-6 col-end-13 z-1 max-sm:row-start-2 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5",
          "accordion-item": "py-1",
          "accordion-trigger": "w-full py-5 text-left text-base font-medium text-[#252523] transition-colors hover:text-[#8b6959]",
          "accordion-panel": "transition-all duration-300",
          "accordion-content": "max-w-2xl pb-5 pr-8 text-sm leading-7 text-[#6c6a64]",
          "accordion-indicator": "mt-0.5 size-5 text-[#8e8b82]"
        }} id="atelier-details-accordion" />
      </Section>

      <Section id="atelier-recommendations" columns={12} rows={7} height={670} columnGap={16} rowGap={16} responsive={{
        tablet: {
          columns: 8,
          rows: 11,
          height: 1218,
          columnGap: 14
        },
        mobile: {
          columns: 4,
          rows: 19,
          height: 1867,
          columnGap: 10,
          rowGap: 18
        }
      }} className="mx-auto w-full max-w-7xl bg-[#f5f0e8] px-8 py-14 max-sm:px-4 max-sm:py-10">
        <Text content="你可能也喜欢" className="font-['Cormorant_Garamond',serif] text-[36px] leading-tight tracking-[-0.02em] text-[#141413] max-sm:text-[30px] row-start-1 row-end-2 col-start-1 col-end-7 z-1 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="atelier-recommendations-title" />
        <Text content="为你的衣橱挑选下一件日常心仪之作" className="self-end text-right text-sm text-[#6c6a64] max-sm:hidden sm:max-lg:hidden row-start-1 row-end-2 col-start-8 col-end-13 z-1" id="atelier-recommendations-note" />
        <Card imgSrc="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=82" imgAlt="Sculpted Linen Top in soft natural light" title="Sculpted Linen Top" description="Warm White  ·  ¥890" buttonLabel="查看商品" buttonHref="/products/atelier-drape-dress" classNames={{
          card: "h-full bg-[#faf9f5] transition-transform duration-200 hover:-translate-y-1 row-start-3 row-end-8 col-start-1 col-end-4 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-7 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-3 max-sm:row-end-7 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-64 w-full object-cover max-sm:h-56",
          "card-header": "gap-1 px-5 pt-5",
          "card-title": "font-['Cormorant_Garamond',serif] text-2xl tracking-[-0.02em] text-[#141413]",
          "card-description": "text-sm text-[#6c6a64]",
          "card-footer": "px-5 pb-5 pt-4",
          "card-action": "text-sm text-[#252523] underline underline-offset-4 transition-colors hover:text-[#8b6959]"
        }} id="atelier-recommendation-linen-top" />
        <Card imgSrc="https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=700&q=82" imgAlt="Bias Satin Skirt in soft studio light" title="Bias Satin Skirt" description="Dove Grey  ·  ¥1,190" buttonLabel="查看商品" buttonHref="/" classNames={{
          card: "h-full bg-[#faf9f5] transition-transform duration-200 hover:-translate-y-1 row-start-3 row-end-8 col-start-4 col-end-7 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-7 sm:max-lg:col-start-5 sm:max-lg:col-end-9 max-sm:row-start-7 max-sm:row-end-11 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-64 w-full object-cover max-sm:h-56",
          "card-header": "gap-1 px-5 pt-5",
          "card-title": "font-['Cormorant_Garamond',serif] text-2xl tracking-[-0.02em] text-[#141413]",
          "card-description": "text-sm text-[#6c6a64]",
          "card-footer": "px-5 pb-5 pt-4",
          "card-action": "text-sm text-[#252523] underline underline-offset-4 transition-colors hover:text-[#8b6959]"
        }} id="atelier-recommendation-satin-skirt" />
        <Card imgSrc="https://images.unsplash.com/photo-1549062572-544a64fb0c56?auto=format&fit=crop&w=700&q=82" imgAlt="Soft Tailored Blazer in warm studio light" title="Soft Tailored Blazer" description="Oatmeal  ·  ¥1,680" buttonLabel="查看商品" buttonHref="/products/atelier-drape-dress" classNames={{
          card: "h-full bg-[#faf9f5] transition-transform duration-200 hover:-translate-y-1 row-start-3 row-end-8 col-start-7 col-end-10 z-1 sm:max-lg:row-start-7 sm:max-lg:row-end-11 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-11 max-sm:row-end-15 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-64 w-full object-cover max-sm:h-56",
          "card-header": "gap-1 px-5 pt-5",
          "card-title": "font-['Cormorant_Garamond',serif] text-2xl tracking-[-0.02em] text-[#141413]",
          "card-description": "text-sm text-[#6c6a64]",
          "card-footer": "px-5 pb-5 pt-4",
          "card-action": "text-sm text-[#252523] underline underline-offset-4 transition-colors hover:text-[#8b6959]"
        }} id="atelier-recommendation-blazer" />
        <Card imgSrc="https://images.unsplash.com/photo-1496217590455-aa63a8350eea?auto=format&fit=crop&w=700&q=82" imgAlt="Fine Knit Cardigan in an ivory palette" title="Fine Knit Cardigan" description="Ivory  ·  ¥1,080" buttonLabel="查看商品" buttonHref="/" classNames={{
          card: "h-full bg-[#faf9f5] transition-transform duration-200 hover:-translate-y-1 row-start-3 row-end-8 col-start-10 col-end-13 z-1 sm:max-lg:row-start-7 sm:max-lg:row-end-11 sm:max-lg:col-start-5 sm:max-lg:col-end-9 max-sm:row-start-15 max-sm:row-end-19 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-64 w-full object-cover max-sm:h-56",
          "card-header": "gap-1 px-5 pt-5",
          "card-title": "font-['Cormorant_Garamond',serif] text-2xl tracking-[-0.02em] text-[#141413]",
          "card-description": "text-sm text-[#6c6a64]",
          "card-footer": "px-5 pb-5 pt-4",
          "card-action": "text-sm text-[#252523] underline underline-offset-4 transition-colors hover:text-[#8b6959]"
        }} id="atelier-recommendation-cardigan" />
      </Section>

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
