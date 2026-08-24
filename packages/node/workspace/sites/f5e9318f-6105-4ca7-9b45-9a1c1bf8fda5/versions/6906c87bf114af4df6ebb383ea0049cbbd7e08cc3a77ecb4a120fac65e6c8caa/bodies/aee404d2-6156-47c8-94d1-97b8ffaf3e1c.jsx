import { Button, Card, Icon, Image, Newsletter, Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root >
      <Section id="section_aee404d2-6156-47c8-94d1-97b8ffaf3e1c_1787298681794_d160e08a87b27" columns={12} rows={8} height={690} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 8,
          rows: 8,
          height: 650
        },
        mobile: {
          columns: 4,
          rows: 12,
          height: 820,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf9f5] px-6 py-10 max-sm:px-4 max-sm:py-6">
        <Text content="MUSE / SPRING EDIT" className="self-end text-xs font-medium tracking-[0.18em] text-[#8e8b82] row-start-1 row-end-2 col-start-1 col-end-6 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="hero_eyebrow" />
        <Text content="为日常，留一点优雅" className="self-center font-['Cormorant_Garamond',serif] text-[68px] leading-[0.98] tracking-[-0.045em] text-[#141413] sm:max-lg:text-[54px] max-sm:text-[46px] max-sm:leading-[1.02] row-start-2 row-end-6 col-start-1 col-end-7 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-6 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-2 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5" id="hero_title" />
        <Text content="以轻盈面料与克制剪裁，回应城市生活的每一个片刻。MUSE Atelier 为当代女性设计值得反复穿着的衣服。" className="max-w-md self-start text-base leading-7 text-[#5e5b55] max-sm:text-sm max-sm:leading-6 row-start-6 row-end-8 col-start-1 col-end-6 z-1 sm:max-lg:row-start-6 sm:max-lg:row-end-8 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-5 max-sm:row-end-7 max-sm:col-start-1 max-sm:col-end-5" id="hero_copy" />
        <Button label="探索新品" href="/products/atelier-drape-dress" endIcon="ArrowRight" className="self-start rounded-md bg-[#252523] px-5 py-3 text-sm font-medium text-[#faf9f5] transition duration-200 hover:-translate-y-0.5 hover:bg-[#6c6258] row-start-8 row-end-9 col-start-1 col-end-4 z-1 max-sm:row-start-7 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-4" id="hero_cta" />
        <Image src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85" alt="自然光下穿着浅色都市女装的女性" className="h-full w-full rounded-xl object-cover object-center row-start-1 row-end-9 col-start-7 col-end-13 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-9 sm:max-lg:col-start-5 sm:max-lg:col-end-9 max-sm:row-start-8 max-sm:row-end-13 max-sm:col-start-1 max-sm:col-end-5" id="hero_image" />
      </Section>

      <Section id="new-arrivals-section" columns={12} rows={8} height={852} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 8,
          rows: 11,
          height: 821
        },
        mobile: {
          columns: 4,
          rows: 23,
          height: 2071,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#f5f0e8] px-6 py-12 max-sm:px-4 max-sm:py-10">
        <Text content="01 / 本周新品" className="text-xs font-medium tracking-[0.16em] text-[#8e8b82] row-start-1 row-end-2 col-start-1 col-end-4 z-1 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="new-arrivals-kicker" />
        <Text content="刚刚好，成为日常" className="font-['Cormorant_Garamond',serif] text-[42px] leading-tight tracking-[-0.03em] text-[#141413] max-sm:text-[34px] row-start-2 row-end-4 col-start-1 col-end-7 z-1 max-sm:row-start-2 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5" id="new-arrivals-title" />
        <Card imgSrc="https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=700&q=82" imgAlt="米白色轻薄连衣裙" title="垂褶日光连衣裙" description="象牙白 · 真丝混纺" content="¥ 1,890" buttonLabel="查看详情" buttonHref="/products/atelier-drape-dress" classNames={{
          card: "group flex h-full flex-col gap-4 row-start-4 row-end-9 col-start-1 col-end-4 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-12 sm:max-lg:col-start-1 sm:max-lg:col-end-3 max-sm:row-start-3 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[320px] w-full rounded-lg object-cover transition duration-300 group-hover:scale-[1.02] max-sm:h-[280px]",
          "card-header": "gap-1",
          "card-title": "text-base font-medium text-[#252523]",
          "card-description": "text-sm text-[#8e8b82]",
          "card-content": "mt-auto text-sm font-medium text-[#252523]",
          "card-footer": "pt-1",
          "card-action": "text-sm text-[#6c6258] underline underline-offset-4 transition-colors hover:text-[#141413]"
        }} id="new-card-01" />
        <Card imgSrc="https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=700&q=82" imgAlt="浅灰色剪裁西装外套" title="城市线条西装" description="雾灰色 · 羊毛混纺" content="¥ 2,280" buttonLabel="查看详情" buttonHref="/products/atelier-drape-dress" classNames={{
          card: "group flex h-full flex-col gap-4 row-start-4 row-end-9 col-start-4 col-end-7 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-12 sm:max-lg:col-start-3 sm:max-lg:col-end-5 max-sm:row-start-8 max-sm:row-end-13 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[320px] w-full rounded-lg object-cover transition duration-300 group-hover:scale-[1.02] max-sm:h-[280px]",
          "card-header": "gap-1",
          "card-title": "text-base font-medium text-[#252523]",
          "card-description": "text-sm text-[#8e8b82]",
          "card-content": "mt-auto text-sm font-medium text-[#252523]",
          "card-footer": "pt-1",
          "card-action": "text-sm text-[#6c6258] underline underline-offset-4 transition-colors hover:text-[#141413]"
        }} id="new-card-02" />
        <Card imgSrc="https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=700&q=82" imgAlt="米色针织上衣与长裙" title="柔光针织上衣" description="燕麦色 · 美利奴羊毛" content="¥ 980" buttonLabel="查看详情" buttonHref="/products/atelier-drape-dress" classNames={{
          card: "group flex h-full flex-col gap-4 row-start-4 row-end-9 col-start-7 col-end-10 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-12 sm:max-lg:col-start-5 sm:max-lg:col-end-7 max-sm:row-start-13 max-sm:row-end-18 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[320px] w-full rounded-lg object-cover transition duration-300 group-hover:scale-[1.02] max-sm:h-[280px]",
          "card-header": "gap-1",
          "card-title": "text-base font-medium text-[#252523]",
          "card-description": "text-sm text-[#8e8b82]",
          "card-content": "mt-auto text-sm font-medium text-[#252523]",
          "card-footer": "pt-1",
          "card-action": "text-sm text-[#6c6258] underline underline-offset-4 transition-colors hover:text-[#141413]"
        }} id="new-card-03" />
        <Card imgSrc="https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=700&q=82" imgAlt="奶油色宽松衬衫" title="留白宽松衬衫" description="奶油色 · 棉府绸" content="¥ 1,160" buttonLabel="查看详情" buttonHref="/products/atelier-drape-dress" classNames={{
          card: "group flex h-full flex-col gap-4 row-start-4 row-end-9 col-start-10 col-end-13 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-12 sm:max-lg:col-start-7 sm:max-lg:col-end-9 max-sm:row-start-18 max-sm:row-end-23 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[320px] w-full rounded-lg object-cover transition duration-300 group-hover:scale-[1.02] max-sm:h-[280px]",
          "card-header": "gap-1",
          "card-title": "text-base font-medium text-[#252523]",
          "card-description": "text-sm text-[#8e8b82]",
          "card-content": "mt-auto text-sm font-medium text-[#252523]",
          "card-footer": "pt-1",
          "card-action": "text-sm text-[#6c6258] underline underline-offset-4 transition-colors hover:text-[#141413]"
        }} id="new-card-04" />
      </Section>

      <Section id="popular-picks-section" columns={12} rows={12} height={900} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 8,
          rows: 12,
          height: 870
        },
        mobile: {
          columns: 4,
          rows: 31,
          height: 2110,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf9f5] px-6 py-12 max-sm:px-4 max-sm:py-10">
        <Text content="02 / 人气精选" className="text-xs font-medium tracking-[0.16em] text-[#8e8b82] row-start-1 row-end-2 col-start-1 col-end-4 z-1 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="popular-kicker" />
        <Text content="被反复穿着的好衣服" className="font-['Cormorant_Garamond',serif] text-[42px] leading-tight tracking-[-0.03em] text-[#141413] max-sm:text-[34px] row-start-2 row-end-4 col-start-1 col-end-7 z-1 max-sm:row-start-2 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5" id="popular-title" />
        <Card imgSrc="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=82" imgAlt="黑色修身长裙" title="夜色缎面长裙" description="深黑色 · 再生醋酸" content="¥ 1,680" buttonLabel="加入购物袋" buttonHref="/products/atelier-drape-dress" classNames={{
          card: "group flex h-full flex-col gap-4 row-start-4 row-end-12 col-start-1 col-end-4 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-12 sm:max-lg:col-start-1 sm:max-lg:col-end-3 max-sm:row-start-3 max-sm:row-end-10 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[320px] w-full rounded-lg object-cover transition duration-300 group-hover:scale-[1.02] max-sm:h-[280px]",
          "card-header": "gap-1",
          "card-title": "text-base font-medium text-[#252523]",
          "card-description": "text-sm text-[#8e8b82]",
          "card-content": "mt-auto text-sm font-medium text-[#252523]",
          "card-footer": "pt-1",
          "card-action": "inline-flex w-full items-center justify-center rounded-md bg-[#252523] px-4 py-3 text-sm text-[#faf9f5] transition-colors hover:bg-[#6c6258]"
        }} id="popular-card-01" />
        <Icon name="Heart" ariaLabel="收藏夜色缎面长裙" className="self-start justify-self-end text-[#6c6258] max-sm:hidden row-start-12 row-end-13 col-start-3 col-end-4 z-2 sm:max-lg:row-start-12 sm:max-lg:row-end-13 sm:max-lg:col-start-2 sm:max-lg:col-end-3 max-sm:row-start-10 max-sm:row-end-11 max-sm:col-start-4 max-sm:col-end-5" id="favorite-01" />
        <Card imgSrc="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=82" imgAlt="驼色长款风衣" title="城市风衣" description="焦糖色 · 防泼水棉" content="¥ 2,490" buttonLabel="加入购物袋" buttonHref="/products/atelier-drape-dress" classNames={{
          card: "group flex h-full flex-col gap-4 row-start-4 row-end-12 col-start-4 col-end-7 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-12 sm:max-lg:col-start-3 sm:max-lg:col-end-5 max-sm:row-start-10 max-sm:row-end-17 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[320px] w-full rounded-lg object-cover transition duration-300 group-hover:scale-[1.02] max-sm:h-[280px]",
          "card-header": "gap-1",
          "card-title": "text-base font-medium text-[#252523]",
          "card-description": "text-sm text-[#8e8b82]",
          "card-content": "mt-auto text-sm font-medium text-[#252523]",
          "card-footer": "pt-1",
          "card-action": "inline-flex w-full items-center justify-center rounded-md bg-[#252523] px-4 py-3 text-sm text-[#faf9f5] transition-colors hover:bg-[#6c6258]"
        }} id="popular-card-02" />
        <Icon name="Heart" ariaLabel="收藏城市风衣" className="self-start justify-self-end text-[#6c6258] max-sm:hidden row-start-12 row-end-13 col-start-6 col-end-7 z-2 sm:max-lg:row-start-12 sm:max-lg:row-end-13 sm:max-lg:col-start-4 sm:max-lg:col-end-5 max-sm:row-start-17 max-sm:row-end-18 max-sm:col-start-4 max-sm:col-end-5" id="favorite-02" />
        <Card imgSrc="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=82" imgAlt="白色宽肩衬衫" title="宽肩白衬衫" description="云白色 · 长绒棉" content="¥ 890" buttonLabel="加入购物袋" buttonHref="/products/atelier-drape-dress" classNames={{
          card: "group flex h-full flex-col gap-4 row-start-4 row-end-12 col-start-7 col-end-10 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-12 sm:max-lg:col-start-5 sm:max-lg:col-end-7 max-sm:row-start-17 max-sm:row-end-24 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[320px] w-full rounded-lg object-cover transition duration-300 group-hover:scale-[1.02] max-sm:h-[280px]",
          "card-header": "gap-1",
          "card-title": "text-base font-medium text-[#252523]",
          "card-description": "text-sm text-[#8e8b82]",
          "card-content": "mt-auto text-sm font-medium text-[#252523]",
          "card-footer": "pt-1",
          "card-action": "inline-flex w-full items-center justify-center rounded-md bg-[#252523] px-4 py-3 text-sm text-[#faf9f5] transition-colors hover:bg-[#6c6258]"
        }} id="popular-card-03" />
        <Icon name="Heart" ariaLabel="收藏宽肩白衬衫" className="self-start justify-self-end text-[#6c6258] max-sm:hidden row-start-12 row-end-13 col-start-9 col-end-10 z-2 sm:max-lg:row-start-12 sm:max-lg:row-end-13 sm:max-lg:col-start-6 sm:max-lg:col-end-7 max-sm:row-start-24 max-sm:row-end-25 max-sm:col-start-4 max-sm:col-end-5" id="favorite-03" />
        <Card imgSrc="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=82" imgAlt="米色针织开衫" title="午后针织开衫" description="燕麦色 · 羊绒混纺" content="¥ 1,280" buttonLabel="加入购物袋" buttonHref="/products/atelier-drape-dress" classNames={{
          card: "group flex h-full flex-col gap-4 row-start-4 row-end-12 col-start-10 col-end-13 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-12 sm:max-lg:col-start-7 sm:max-lg:col-end-9 max-sm:row-start-24 max-sm:row-end-31 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[320px] w-full rounded-lg object-cover transition duration-300 group-hover:scale-[1.02] max-sm:h-[280px]",
          "card-header": "gap-1",
          "card-title": "text-base font-medium text-[#252523]",
          "card-description": "text-sm text-[#8e8b82]",
          "card-content": "mt-auto text-sm font-medium text-[#252523]",
          "card-footer": "pt-1",
          "card-action": "inline-flex w-full items-center justify-center rounded-md bg-[#252523] px-4 py-3 text-sm text-[#faf9f5] transition-colors hover:bg-[#6c6258]"
        }} id="popular-card-04" />
        <Icon name="Heart" ariaLabel="收藏午后针织开衫" className="self-start justify-self-end text-[#6c6258] max-sm:hidden row-start-12 row-end-13 col-start-12 col-end-13 z-2 sm:max-lg:row-start-12 sm:max-lg:row-end-13 sm:max-lg:col-start-8 sm:max-lg:col-end-9 max-sm:row-start-31 max-sm:row-end-32 max-sm:col-start-4 max-sm:col-end-5" id="favorite-04" />
      </Section>

      <Section id="brand-story-section" columns={12} rows={5} height={420} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 8,
          rows: 5,
          height: 400
        },
        mobile: {
          columns: 4,
          rows: 7,
          height: 460,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#e8e0d2] px-6 py-12 max-sm:px-4 max-sm:py-10">
        <Text content="MUSE Atelier" className="font-['Cormorant_Garamond',serif] text-[42px] leading-none tracking-[-0.04em] text-[#141413] max-sm:text-[34px] row-start-1 row-end-3 col-start-1 col-end-5 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-4 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="story-title" />
        <Text content="简约，不是删去一切；而是留下真正重要的。我们从巴黎街角的松弛感与城市女性的坚定步伐中汲取灵感，以自然面料、清晰线条和轻柔色调，制作可以陪你走得更远的衣服。" className="text-[22px] leading-8 text-[#3d3d3a] max-sm:text-lg max-sm:leading-7 row-start-2 row-end-5 col-start-5 col-end-11 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-5 sm:max-lg:col-start-4 sm:max-lg:col-end-9 max-sm:row-start-2 max-sm:row-end-6 max-sm:col-start-1 max-sm:col-end-5" id="story-copy" />
        <Text content="轻法式 · 都市感 · 长久穿着" className="self-end text-xs font-medium tracking-[0.14em] text-[#6c6a64] row-start-5 row-end-6 col-start-9 col-end-13 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-6 sm:max-lg:col-start-5 sm:max-lg:col-end-9 max-sm:row-start-6 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5" id="story-signature" />
      </Section>

      <Section id="newsletter-section" columns={12} rows={4} height={312} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 8,
          rows: 4,
          height: 312
        },
        mobile: {
          columns: 4,
          rows: 6,
          height: 390,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf9f5] px-6 py-12 max-sm:px-4 max-sm:py-10">
        <Newsletter title="把新鲜灵感，寄给你" description="订阅 MUSE Atelier，接收新品预览、穿搭灵感与限时礼遇。" emailLabel="邮箱地址" emailPlaceholder="输入你的邮箱" buttonLabel="订阅" privacyText="订阅即表示你同意接收 MUSE Atelier 的邮件。我们尊重你的隐私。" classNames={{
          newsletter: "mx-auto flex w-full max-w-3xl flex-col justify-center text-center row-start-1 row-end-5 col-start-3 col-end-11 z-1 max-sm:row-start-1 max-sm:row-end-7 max-sm:col-start-1 max-sm:col-end-5",
          "newsletter-title": "font-['Cormorant_Garamond',serif] text-[38px] leading-tight tracking-[-0.03em] text-[#141413] max-sm:text-[32px]",
          "newsletter-description": "mt-2 text-sm leading-6 text-[#6c6a64]",
          "newsletter-form": "mt-7 flex items-end gap-3 max-sm:flex-col max-sm:items-stretch",
          "newsletter-field": "flex-1 text-left",
          "newsletter-label": "mb-2 block text-xs font-medium tracking-wide text-[#6c6a64]",
          "newsletter-input": "h-12 w-full rounded-md border border-[#d6cec3] bg-[#faf9f5] px-4 text-sm text-[#141413] outline-none transition focus:border-[#6c6258] focus:ring-2 focus:ring-[#e8e0d2]",
          "newsletter-button": "h-12 rounded-md bg-[#252523] px-6 text-sm font-medium text-[#faf9f5] transition duration-200 hover:-translate-y-0.5 hover:bg-[#6c6258] max-sm:w-full",
          "newsletter-privacy": "mt-4 text-xs leading-5 text-[#8e8b82]"
        }} id="newsletter-form" />
      </Section>
    </Root>
  );
}
