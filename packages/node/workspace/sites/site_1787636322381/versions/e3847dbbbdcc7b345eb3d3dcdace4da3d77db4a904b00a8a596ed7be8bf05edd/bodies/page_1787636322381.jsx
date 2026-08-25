import { Button, Card, Image, Newsletter, Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="text-neutral-950">
      <Section id="home_hero_section" columns={12} rows={8} height={620} columnGap={16} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 8,
          height: 868,
          columnGap: 12
        },
        mobile: {
          columns: 4,
          rows: 12,
          height: 760,
          columnGap: 10,
          rowGap: 10
        }
      }} className="mx-auto w-full max-w-6xl px-6 py-10 sm:max-lg:px-8 max-sm:px-4 max-sm:py-6">
        <Text content="春日新章 / 2024" className="self-end text-xs font-medium uppercase tracking-[0.18em] text-[#8e8b82] row-start-2 row-end-3 col-start-1 col-end-6 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-6 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="home_hero_eyebrow" />
        <Text content="为日常，留一点优雅" className="max-w-xl font-['Cormorant_Garamond',serif] text-[64px] font-medium leading-[0.98] tracking-[-0.04em] text-[#141413] sm:max-lg:text-[52px] max-sm:text-[42px] max-sm:leading-[1.02] row-start-3 row-end-6 col-start-1 col-end-7 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-6 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-2 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5" id="home_hero_title" />
        <Text content="以柔和色调、利落剪裁与舒适面料，陪你从清晨到黄昏。每一件都为真实生活而设计。" className="max-w-md text-base leading-7 text-[#3d3d3a] text-pretty row-start-6 row-end-7 col-start-1 col-end-6 z-1 sm:max-lg:row-start-6 sm:max-lg:row-end-7 sm:max-lg:col-start-1 sm:max-lg:col-end-6 max-sm:row-start-5 max-sm:row-end-7 max-sm:col-start-1 max-sm:col-end-5" id="home_hero_description" />
        <Button label="探索新品" href="#home_new_section" endIcon="ArrowRight" className="w-fit rounded-md bg-[#cc785c] px-5 py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-[#a9583e] hover:-translate-y-0.5 active:translate-y-px row-start-7 row-end-8 col-start-1 col-end-4 z-1 sm:max-lg:row-start-7 sm:max-lg:row-end-8 sm:max-lg:col-start-1 sm:max-lg:col-end-4 max-sm:row-start-7 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-4" id="home_hero_cta" />
        <Image src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85" alt="身穿米色外套的女性站在明亮室内" className="h-full w-full rounded-xl object-cover row-start-1 row-end-9 col-start-8 col-end-13 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-9 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-8 max-sm:row-end-13 max-sm:col-start-1 max-sm:col-end-5" id="home_hero_image" />
      </Section>

      <Section id="home_new_section" columns={12} rows={8} height={820} columnGap={16} rowGap={16} responsive={{
        tablet: {
          columns: 6,
          rows: 17,
          height: 1250,
          columnGap: 12,
          rowGap: 12
        },
        mobile: {
          columns: 4,
          rows: 14,
          height: 1200,
          columnGap: 10,
          rowGap: 12
        }
      }} className="mx-auto w-full max-w-6xl bg-[#f5f0e8] px-6 py-12 sm:max-lg:px-8 max-sm:px-4 max-sm:py-10">
        <Text content="本周新品" className="font-['Cormorant_Garamond',serif] text-[40px] leading-none tracking-[-0.03em] text-[#141413] row-start-1 row-end-2 col-start-1 col-end-5 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="home_new_title" />
        <Text content="轻盈入季，发现本周刚刚抵达的日常新作。" className="self-center text-sm text-[#6c6a64] row-start-1 row-end-2 col-start-8 col-end-13 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-2 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5" id="home_new_intro" />
        <Card imgSrc="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=85" imgAlt="米色针织衫女装" title="晨雾针织衫" description="¥ 699" buttonLabel="查看详情" buttonHref="/product-detail" classNames={{
          card: "h-full rounded-lg bg-[#faf9f5] p-4 transition-transform duration-200 hover:-translate-y-1 row-start-2 row-end-9 col-start-1 col-end-4 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-10 sm:max-lg:col-start-1 sm:max-lg:col-end-4 max-sm:row-start-3 max-sm:row-end-9 max-sm:col-start-1 max-sm:col-end-3",
          "card-img": "h-[340px] w-full rounded-md object-cover max-sm:h-[300px]",
          "card-header": "pt-4",
          "card-title": "font-['Cormorant_Garamond',serif] text-[24px] leading-none text-[#141413]",
          "card-description": "mt-2 text-sm text-[#6c6a64]",
          "card-footer": "pt-4",
          "card-action": "text-sm font-medium text-[#cc785c] underline-offset-4 transition-colors hover:text-[#a9583e] hover:underline"
        }} id="home_new_card_one" />
        <Card imgSrc="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=85" imgAlt="白色衬衫女装" title="留白衬衫" description="¥ 799" buttonLabel="查看详情" buttonHref="/product-detail" classNames={{
          card: "h-full rounded-lg bg-[#faf9f5] p-4 transition-transform duration-200 hover:-translate-y-1 row-start-2 row-end-9 col-start-4 col-end-7 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-10 sm:max-lg:col-start-4 sm:max-lg:col-end-7 max-sm:row-start-3 max-sm:row-end-9 max-sm:col-start-3 max-sm:col-end-5",
          "card-img": "h-[340px] w-full rounded-md object-cover max-sm:h-[300px]",
          "card-header": "pt-4",
          "card-title": "font-['Cormorant_Garamond',serif] text-[24px] leading-none text-[#141413]",
          "card-description": "mt-2 text-sm text-[#6c6a64]",
          "card-footer": "pt-4",
          "card-action": "text-sm font-medium text-[#cc785c] underline-offset-4 transition-colors hover:text-[#a9583e] hover:underline"
        }} id="home_new_card_two" />
        <Card imgSrc="https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=700&q=85" imgAlt="浅棕色风衣女装" title="微风风衣" description="¥ 1,299" buttonLabel="查看详情" buttonHref="/product-detail" classNames={{
          card: "h-full rounded-lg bg-[#faf9f5] p-4 transition-transform duration-200 hover:-translate-y-1 row-start-2 row-end-9 col-start-7 col-end-10 z-1 sm:max-lg:row-start-10 sm:max-lg:row-end-17 sm:max-lg:col-start-1 sm:max-lg:col-end-4 max-sm:row-start-9 max-sm:row-end-15 max-sm:col-start-1 max-sm:col-end-3",
          "card-img": "h-[340px] w-full rounded-md object-cover max-sm:h-[300px]",
          "card-header": "pt-4",
          "card-title": "font-['Cormorant_Garamond',serif] text-[24px] leading-none text-[#141413]",
          "card-description": "mt-2 text-sm text-[#6c6a64]",
          "card-footer": "pt-4",
          "card-action": "text-sm font-medium text-[#cc785c] underline-offset-4 transition-colors hover:text-[#a9583e] hover:underline"
        }} id="home_new_card_three" />
        <Card imgSrc="https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=700&q=85" imgAlt="玫瑰色半身裙女装" title="玫瑰半身裙" description="¥ 899" buttonLabel="查看详情" buttonHref="/product-detail" classNames={{
          card: "h-full rounded-lg bg-[#faf9f5] p-4 transition-transform duration-200 hover:-translate-y-1 row-start-2 row-end-9 col-start-10 col-end-13 z-1 sm:max-lg:row-start-10 sm:max-lg:row-end-17 sm:max-lg:col-start-4 sm:max-lg:col-end-7 max-sm:row-start-9 max-sm:row-end-15 max-sm:col-start-3 max-sm:col-end-5",
          "card-img": "h-[340px] w-full rounded-md object-cover max-sm:h-[300px]",
          "card-header": "pt-4",
          "card-title": "font-['Cormorant_Garamond',serif] text-[24px] leading-none text-[#141413]",
          "card-description": "mt-2 text-sm text-[#6c6a64]",
          "card-footer": "pt-4",
          "card-action": "text-sm font-medium text-[#cc785c] underline-offset-4 transition-colors hover:text-[#a9583e] hover:underline"
        }} id="home_new_card_four" />
      </Section>

      <Section id="home_favorites_section" columns={12} rows={8} height={820} columnGap={16} rowGap={16} responsive={{
        tablet: {
          columns: 6,
          rows: 17,
          height: 1250,
          columnGap: 12,
          rowGap: 12
        },
        mobile: {
          columns: 4,
          rows: 14,
          height: 1200,
          columnGap: 10,
          rowGap: 12
        }
      }} className="mx-auto w-full max-w-6xl px-6 py-12 sm:max-lg:px-8 max-sm:px-4 max-sm:py-10">
        <Text content="人气精选" className="font-['Cormorant_Garamond',serif] text-[40px] leading-none tracking-[-0.03em] text-[#141413] row-start-1 row-end-2 col-start-1 col-end-5 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="home_favorites_title" />
        <Text content="被反复穿起的款式，温柔而坚定地留在衣橱里。" className="self-center text-sm text-[#6c6a64] row-start-1 row-end-2 col-start-8 col-end-13 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-2 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5" id="home_favorites_intro" />
        <Card imgSrc="https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=700&q=85" imgAlt="黑色简约连衣裙" title="夜色连衣裙" description="¥ 1,099" buttonLabel="查看详情" buttonHref="/product-detail" classNames={{
          card: "h-full rounded-lg border border-[#e6dfd8] bg-[#faf9f5] p-4 transition-transform duration-200 hover:-translate-y-1 row-start-2 row-end-9 col-start-1 col-end-4 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-10 sm:max-lg:col-start-1 sm:max-lg:col-end-4 max-sm:row-start-3 max-sm:row-end-9 max-sm:col-start-1 max-sm:col-end-3",
          "card-img": "h-[340px] w-full rounded-md object-cover max-sm:h-[300px]",
          "card-header": "pt-4",
          "card-title": "font-['Cormorant_Garamond',serif] text-[24px] leading-none text-[#141413]",
          "card-description": "mt-2 text-sm text-[#6c6a64]",
          "card-footer": "pt-4",
          "card-action": "text-sm font-medium text-[#cc785c] underline-offset-4 transition-colors hover:text-[#a9583e] hover:underline"
        }} id="home_favorite_card_one" />
        <Card imgSrc="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=85" imgAlt="驼色羊毛大衣" title="温柔大衣" description="¥ 1,599" buttonLabel="查看详情" buttonHref="/product-detail" classNames={{
          card: "h-full rounded-lg border border-[#e6dfd8] bg-[#faf9f5] p-4 transition-transform duration-200 hover:-translate-y-1 row-start-2 row-end-9 col-start-4 col-end-7 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-10 sm:max-lg:col-start-4 sm:max-lg:col-end-7 max-sm:row-start-3 max-sm:row-end-9 max-sm:col-start-3 max-sm:col-end-5",
          "card-img": "h-[340px] w-full rounded-md object-cover max-sm:h-[300px]",
          "card-header": "pt-4",
          "card-title": "font-['Cormorant_Garamond',serif] text-[24px] leading-none text-[#141413]",
          "card-description": "mt-2 text-sm text-[#6c6a64]",
          "card-footer": "pt-4",
          "card-action": "text-sm font-medium text-[#cc785c] underline-offset-4 transition-colors hover:text-[#a9583e] hover:underline"
        }} id="home_favorite_card_two" />
        <Card imgSrc="https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=700&q=85" imgAlt="米白色西装外套" title="日光西装" description="¥ 1,299" buttonLabel="查看详情" buttonHref="/product-detail" classNames={{
          card: "h-full rounded-lg border border-[#e6dfd8] bg-[#faf9f5] p-4 transition-transform duration-200 hover:-translate-y-1 row-start-2 row-end-9 col-start-7 col-end-10 z-1 sm:max-lg:row-start-10 sm:max-lg:row-end-17 sm:max-lg:col-start-1 sm:max-lg:col-end-4 max-sm:row-start-9 max-sm:row-end-15 max-sm:col-start-1 max-sm:col-end-3",
          "card-img": "h-[340px] w-full rounded-md object-cover max-sm:h-[300px]",
          "card-header": "pt-4",
          "card-title": "font-['Cormorant_Garamond',serif] text-[24px] leading-none text-[#141413]",
          "card-description": "mt-2 text-sm text-[#6c6a64]",
          "card-footer": "pt-4",
          "card-action": "text-sm font-medium text-[#cc785c] underline-offset-4 transition-colors hover:text-[#a9583e] hover:underline"
        }} id="home_favorite_card_three" />
        <Card imgSrc="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=85" imgAlt="棕色针织开衫" title="午后开衫" description="¥ 749" buttonLabel="查看详情" buttonHref="/product-detail" classNames={{
          card: "h-full rounded-lg border border-[#e6dfd8] bg-[#faf9f5] p-4 transition-transform duration-200 hover:-translate-y-1 row-start-2 row-end-9 col-start-10 col-end-13 z-1 sm:max-lg:row-start-10 sm:max-lg:row-end-17 sm:max-lg:col-start-4 sm:max-lg:col-end-7 max-sm:row-start-9 max-sm:row-end-15 max-sm:col-start-3 max-sm:col-end-5",
          "card-img": "h-[340px] w-full rounded-md object-cover max-sm:h-[300px]",
          "card-header": "pt-4",
          "card-title": "font-['Cormorant_Garamond',serif] text-[24px] leading-none text-[#141413]",
          "card-description": "mt-2 text-sm text-[#6c6a64]",
          "card-footer": "pt-4",
          "card-action": "text-sm font-medium text-[#cc785c] underline-offset-4 transition-colors hover:text-[#a9583e] hover:underline"
        }} id="home_favorite_card_four" />
      </Section>

      <Section id="home_values_section" columns={12} rows={6} height={520} columnGap={16} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 6,
          height: 500
        },
        mobile: {
          columns: 4,
          rows: 8,
          height: 650,
          columnGap: 10,
          rowGap: 10
        }
      }} className="mx-auto w-full max-w-6xl bg-[#e8e0d2] px-6 py-12 sm:max-lg:px-8 max-sm:px-4 max-sm:py-10">
        <Text content="我们的理念" className="text-xs font-medium uppercase tracking-[0.18em] text-[#6c6a64] row-start-1 row-end-2 col-start-1 col-end-4 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-4 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="home_values_eyebrow" />
        <Text content="把优雅放回日常，" className="font-['Cormorant_Garamond',serif] text-[48px] leading-none tracking-[-0.03em] text-[#141413] sm:max-lg:text-[42px] max-sm:text-[38px] row-start-2 row-end-4 col-start-1 col-end-7 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-4 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-2 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5" id="home_values_title" />
        <Text content="也把品质留在每一次穿着里。" className="font-['Cormorant_Garamond',serif] text-[48px] leading-none tracking-[-0.03em] text-[#141413] sm:max-lg:text-[42px] max-sm:text-[38px] row-start-4 row-end-6 col-start-1 col-end-7 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-6 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-3 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5" id="home_values_subtitle" />
        <Text content="我们相信，真正长久的衣服不需要喧哗。我们从面料触感、版型比例与细节工艺出发，做适合被反复穿起的衣服，让舒适与审美自然共存。" className="max-w-md text-base leading-7 text-[#3d3d3a] row-start-2 row-end-5 col-start-8 col-end-13 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-5 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-5 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5" id="home_values_description" />
      </Section>

      <Section id="home_newsletter_section" columns={12} rows={5} height={390} columnGap={16} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 5,
          height: 390
        },
        mobile: {
          columns: 4,
          rows: 7,
          height: 470,
          columnGap: 10,
          rowGap: 10
        }
      }} className="mx-auto w-full max-w-6xl px-6 py-12 sm:max-lg:px-8 max-sm:px-4 max-sm:py-10">
        <Newsletter title="把新消息寄给你" description="订阅品牌来信，优先了解新品、面料故事与不定期的衣橱灵感。" emailLabel="邮箱地址" emailPlaceholder="请输入你的邮箱" buttonLabel="立即订阅" privacyText="我们尊重你的收件箱，可随时取消订阅。" classNames={{
          newsletter: "h-full rounded-lg bg-[#181715] px-8 py-10 text-[#faf9f5] max-sm:px-5 max-sm:py-8 row-start-1 row-end-6 col-start-1 col-end-13 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-6 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5",
          "newsletter-title": "font-['Cormorant_Garamond',serif] text-[36px] leading-none tracking-[-0.03em]",
          "newsletter-description": "mt-3 max-w-lg text-sm leading-6 text-[#a09d96]",
          "newsletter-form": "mt-8 flex max-w-xl items-end gap-3 max-sm:mt-7 max-sm:flex-col max-sm:items-stretch",
          "newsletter-field": "min-w-0 flex-1",
          "newsletter-label": "mb-2 block text-xs font-medium text-[#faf9f5]",
          "newsletter-input": "h-11 w-full rounded-md border border-[#4a4640] bg-[#252320] px-4 text-sm text-[#faf9f5] placeholder:text-[#8e8b82] focus:border-[#cc785c] focus:outline-none",
          "newsletter-button": "h-11 shrink-0 rounded-md bg-[#cc785c] px-5 text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-[#a9583e] hover:-translate-y-0.5 active:translate-y-px",
          "newsletter-privacy": "mt-5 text-xs text-[#8e8b82]"
        }} id="home_newsletter" />
      </Section>
    </Root>
  );
}
