import { Accordion, Badge, Button, Card, Carousel, Divider, Image, Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root >
      <Section id="product_detail_hero" columns={12} rows={12} height={900} columnGap={24} rowGap={16} responsive={{
        tablet: {
          columns: 12,
          rows: 12,
          height: 900,
          columnGap: 16
        },
        mobile: {
          columns: 4,
          rows: 26,
          height: 1320,
          columnGap: 12,
          rowGap: 12
        }
      }} className="mx-auto w-full max-w-6xl px-6 py-16 max-sm:px-4 max-sm:py-8">
        <Carousel items={[
          {
            imgSrc: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
            imgAlt: "身穿米白色针织衫的女模特侧身站立"
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=85",
            imgAlt: "米白色针织衫的正面剪裁细节"
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1200&q=85",
            imgAlt: "女模特在自然光下展示针织衫"
          }
        ]} classNames={{
          carousel: "h-full min-h-0 row-start-1 row-end-11 col-start-1 col-end-9 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-11 sm:max-lg:col-start-1 sm:max-lg:col-end-8 max-sm:row-start-1 max-sm:row-end-14 max-sm:col-start-1 max-sm:col-end-5",
          "carousel-content": "h-full",
          "carousel-item": "h-full overflow-hidden rounded-xl bg-[#efe9de]",
          "carousel-item-img": "h-full w-full object-cover",
          "carousel-previous": "left-4 bg-[#faf9f5]/90 text-[#141413] shadow-sm transition-transform hover:-translate-y-1",
          "carousel-next": "right-4 bg-[#faf9f5]/90 text-[#141413] shadow-sm transition-transform hover:-translate-y-1"
        }} id="product_gallery" />
        <Image src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=320&q=80" alt="针织衫模特图缩略图" className="h-full w-full rounded-lg border-2 border-[#cc785c] object-cover row-start-11 row-end-13 col-start-1 col-end-4 z-1 max-sm:row-start-14 max-sm:row-end-17 max-sm:col-start-1 max-sm:col-end-2" id="gallery_thumb_one" />
        <Image src="https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=320&q=80" alt="针织衫剪裁细节缩略图" className="h-full w-full rounded-lg border border-[#e6dfd8] object-cover row-start-11 row-end-13 col-start-4 col-end-7 z-1 max-sm:row-start-14 max-sm:row-end-17 max-sm:col-start-2 max-sm:col-end-3" id="gallery_thumb_two" />
        <Image src="https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=320&q=80" alt="针织衫生活方式缩略图" className="h-full w-full rounded-lg border border-[#e6dfd8] object-cover row-start-11 row-end-13 col-start-7 col-end-9 z-1 sm:max-lg:row-start-11 sm:max-lg:row-end-13 sm:max-lg:col-start-7 sm:max-lg:col-end-9 max-sm:row-start-14 max-sm:row-end-17 max-sm:col-start-3 max-sm:col-end-4" id="gallery_thumb_three" />
        <Badge label="秋冬新作 · 限量色" className="justify-self-start rounded-full bg-[#e8e0d2] px-3 py-1 text-xs font-medium tracking-[0.08em] text-[#6c6a64] row-start-1 row-end-2 col-start-9 col-end-13 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-17 max-sm:row-end-18 max-sm:col-start-1 max-sm:col-end-5" id="product_badge" />
        <Text content="云绒羊毛开衫" className="max-w-md font-['Cormorant_Garamond',serif] text-[52px] leading-[1.02] tracking-[-0.03em] text-[#141413] sm:max-lg:text-[46px] max-sm:text-[40px] row-start-2 row-end-4 col-start-9 col-end-13 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-4 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-18 max-sm:row-end-20 max-sm:col-start-1 max-sm:col-end-5" id="product_title" />
        <Text content="¥ 1,280" className="text-2xl font-medium tracking-[-0.02em] text-[#252523] row-start-4 row-end-5 col-start-9 col-end-13 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-5 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-20 max-sm:row-end-21 max-sm:col-start-1 max-sm:col-end-5" id="product_price" />
        <Text content="轻盈羊毛与羊绒混纺，带来柔软而有温度的日常陪伴。宽松廓形与细腻罗纹，让它自然融入每一种穿衣场景。" className="max-w-md text-[16px] leading-7 text-[#6c6a64] row-start-5 row-end-7 col-start-9 col-end-13 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-7 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-21 max-sm:row-end-23 max-sm:col-start-1 max-sm:col-end-5" id="product_description" />
        <Divider orientation="horizontal" className="border-[#e6dfd8] row-start-7 row-end-8 col-start-9 col-end-13 z-1 sm:max-lg:row-start-7 sm:max-lg:row-end-8 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-23 max-sm:row-end-24 max-sm:col-start-1 max-sm:col-end-5" id="product_divider" />
        <Text content="自然宽松版型 · 建议选择平日尺码" className="text-sm text-[#6c6a64] row-start-8 row-end-9 col-start-9 col-end-13 z-1 sm:max-lg:row-start-8 sm:max-lg:row-end-9 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-24 max-sm:row-end-25 max-sm:col-start-1 max-sm:col-end-5" id="product_fit_note" />
        <Button label="加入购物袋" className="h-12 rounded-md bg-[#cc785c] text-sm font-semibold text-white transition-all hover:bg-[#a9583e] hover:shadow-md row-start-9 row-end-10 col-start-9 col-end-13 z-1 sm:max-lg:row-start-9 sm:max-lg:row-end-10 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-25 max-sm:row-end-26 max-sm:col-start-1 max-sm:col-end-5" id="product_add_button" />
        <Text content="满 ¥500 包邮 · 支持 7 天无理由退换" className="text-center text-xs text-[#8e8b82] row-start-10 row-end-11 col-start-9 col-end-13 z-1 sm:max-lg:row-start-10 sm:max-lg:row-end-11 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-26 max-sm:row-end-27 max-sm:col-start-1 max-sm:col-end-5" id="product_shipping_note" />
      </Section>

      <Section id="product_detail_info" columns={12} rows={7} height={470} columnGap={24} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 7,
          height: 470,
          columnGap: 16
        },
        mobile: {
          columns: 4,
          rows: 8,
          height: 560,
          columnGap: 12,
          rowGap: 12
        }
      }} className="mx-auto w-full max-w-6xl border-t border-[#e6dfd8] px-6 py-12 max-sm:px-4 max-sm:py-8">
        <Text content="材质与服务" className="font-['Cormorant_Garamond',serif] text-[32px] leading-tight tracking-[-0.02em] row-start-1 row-end-2 col-start-1 col-end-5 z-1 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="details_heading" />
        <Accordion multiple items={[
          {
            key: "fabric",
            title: "面料与护理",
            content: "羊毛 90% · 羊绒 10%。建议冷水轻柔手洗，平铺晾干，避免悬挂造成变形。穿着后放置通风处，保持纤维蓬松。"
          },
          {
            key: "delivery",
            title: "配送与退换",
            content: "下单后 1–2 个工作日内发出，顺丰配送。签收后 7 天内、吊牌完整且未使用可申请退换，详情以售后政策为准。"
          }
        ]} classNames={{
          "accordion-item": "border-b border-[#e6dfd8]",
          "accordion-trigger": "items-center py-5 text-left text-lg font-medium text-[#252523] transition-colors hover:text-[#cc785c]",
          "accordion-panel": "transition-[height] duration-300",
          "accordion-content": "max-w-2xl pb-6 pr-8 text-[15px] leading-7 text-[#6c6a64]",
          "accordion-indicator": "text-[#cc785c]",
          accordion: "row-start-2 row-end-7 col-start-1 col-end-9 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-7 sm:max-lg:col-start-1 sm:max-lg:col-end-8 max-sm:row-start-2 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5"
        }} id="product_accordion" />
        <Text content="每一件衣物都经过细致检验，以柔软、耐穿与长久相伴为标准。" className="max-w-xs self-center text-[18px] leading-8 text-[#6c6a64] max-sm:hidden row-start-2 row-end-5 col-start-9 col-end-13 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-5 sm:max-lg:col-start-8 sm:max-lg:col-end-13" id="details_side_note" />
      </Section>

      <Section id="recommendations_section" columns={12} rows={7} height={600} columnGap={16} rowGap={18} responsive={{
        tablet: {
          columns: 12,
          rows: 7,
          height: 600,
          columnGap: 16
        },
        mobile: {
          columns: 4,
          rows: 16,
          height: 1352,
          columnGap: 12,
          rowGap: 16
        }
      }} className="mx-auto w-full max-w-6xl px-6 pb-16 max-sm:px-4 max-sm:pb-10">
        <Text content="你可能也喜欢" className="font-['Cormorant_Garamond',serif] text-[36px] tracking-[-0.02em] max-sm:text-[30px] row-start-1 row-end-2 col-start-1 col-end-13 z-1 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="recommendations_heading" />
        <Card imgSrc="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22800%22%20viewBox%3D%220%200%201200%20800%22%3E%3Crect%20width%3D%221200%22%20height%3D%22800%22%20fill%3D%22%23eeeae4%22%2F%3E%3Cpath%20d%3D%22M390%20520l145-165%20105%20120%2070-80%20100%20125H390z%22%20fill%3D%22%23c9c1b7%22%2F%3E%3Ccircle%20cx%3D%22470%22%20cy%3D%22285%22%20r%3D%2242%22%20fill%3D%22%23c9c1b7%22%2F%3E%3C%2Fsvg%3E" imgAlt="浅米色羊毛大衣" title="晨雾羊毛大衣" description="¥ 2,680" buttonLabel="查看详情" buttonHref="/product-detail" classNames={{
          card: "overflow-hidden rounded-lg bg-[#efe9de] transition-transform duration-200 hover:-translate-y-1 row-start-2 row-end-8 col-start-1 col-end-5 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-8 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-2 max-sm:row-end-7 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-72 w-full object-cover max-sm:h-64",
          "card-header": "gap-1 px-5 pt-5",
          "card-title": "font-['Cormorant_Garamond',serif] text-[25px] text-[#141413]",
          "card-description": "text-sm text-[#6c6a64]",
          "card-footer": "px-5 pb-5 pt-4",
          "card-action": "text-sm font-medium text-[#cc785c] transition-colors hover:text-[#a9583e]"
        }} id="recommendation_card_one" />
        <Card imgSrc="https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=700&q=85" imgAlt="深棕色垂坠长裙" title="褐石垂坠裙" description="¥ 980" buttonLabel="查看详情" buttonHref="/product-detail" classNames={{
          card: "overflow-hidden rounded-lg bg-[#efe9de] transition-transform duration-200 hover:-translate-y-1 row-start-2 row-end-8 col-start-5 col-end-9 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-8 sm:max-lg:col-start-5 sm:max-lg:col-end-9 max-sm:row-start-7 max-sm:row-end-12 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-72 w-full object-cover max-sm:h-64",
          "card-header": "gap-1 px-5 pt-5",
          "card-title": "font-['Cormorant_Garamond',serif] text-[25px] text-[#141413]",
          "card-description": "text-sm text-[#6c6a64]",
          "card-footer": "px-5 pb-5 pt-4",
          "card-action": "text-sm font-medium text-[#cc785c] transition-colors hover:text-[#a9583e]"
        }} id="recommendation_card_two" />
        <Card imgSrc="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=700&q=85" imgAlt="奶油色针织背心" title="奶油针织背心" description="¥ 760" buttonLabel="查看详情" buttonHref="/product-detail" classNames={{
          card: "overflow-hidden rounded-lg bg-[#efe9de] transition-transform duration-200 hover:-translate-y-1 row-start-2 row-end-8 col-start-9 col-end-13 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-8 sm:max-lg:col-start-9 sm:max-lg:col-end-13 max-sm:row-start-12 max-sm:row-end-17 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-72 w-full object-cover max-sm:h-64",
          "card-header": "gap-1 px-5 pt-5",
          "card-title": "font-['Cormorant_Garamond',serif] text-[25px] text-[#141413]",
          "card-description": "text-sm text-[#6c6a64]",
          "card-footer": "px-5 pb-5 pt-4",
          "card-action": "text-sm font-medium text-[#cc785c] transition-colors hover:text-[#a9583e]"
        }} id="recommendation_card_three" />
      </Section>
    </Root>
  );
}
