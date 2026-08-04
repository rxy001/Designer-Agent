import { Button, Card, Carousel, Navbar, Root, Section, Text } from "@/components";

const heroSlides = [
  {
    imgSrc:
      "https://picsum.photos/id/1062/1600/1200",
    imgAlt: "女装模特身穿秋季米色风衣站在城市街角",
    title: "2026 秋冬新章",
    description: "通勤廓形与轻奢针织，满减活动进行中",
  },
  {
    imgSrc:
      "https://picsum.photos/id/1027/1600/1200",
    imgAlt: "模特展示简洁都会风穿搭",
    title: "都会衣橱计划",
    description: "精选外套、衬衫与长裙，叠穿灵感一页看全",
  },
  {
    imgSrc:
      "https://picsum.photos/id/1005/1600/1200",
    imgAlt: "模特手持购物袋展示周末休闲穿搭",
    title: "周末轻松购",
    description: "限时折扣低至 6 折，热门搭配即刻带走",
  },
];

export default function App() {
  return (
    <Root className="bg-[#faf9f5] text-[#141413]">
      <Section
        id="section-nav"
        height={96}
        rows={1}
        columns={22}
        className="border-b border-[#e6dfd8] bg-[#faf9f5]"
      >
        <Navbar
          id="navbar-main"
          brand="MORÉVA"
          sticky
          items={[
            { label: "女装", href: "#women", active: true },
            { label: "男装", href: "#men" },
            { label: "鞋包", href: "#accessories" },
            { label: "新品", href: "#new" },
            { label: "灵感", href: "#stories" },
          ]}
          primaryAction={{ label: "购物车", href: "#cart" }}
          secondaryAction={{ label: "搜索", href: "#search" }}
          classNames={{
            navbar:
              "row-start-1 row-end-2 col-start-1 col-end-23 h-full bg-[#faf9f5] sm:max-lg:col-end-13 max-sm:col-end-5",
            "navbar-inner":
              "h-full px-10 max-sm:px-4 sm:max-lg:px-6 border-none",
            "navbar-brand":
              "font-[Georgia] text-[22px] font-normal tracking-[-0.04em] text-[#141413]",
            "navbar-nav-list":
              "justify-center gap-2 font-sans text-[14px] font-medium text-[#3d3d3a]",
            "navbar-nav-item":
              "rounded-full px-4 py-2 text-[#6c6a64] transition-all duration-200 hover:bg-[#efe9de] hover:text-[#141413]",
            "navbar-active-nav-item": "bg-[#efe9de] text-[#141413]",
            "navbar-actions": "gap-3",
            "navbar-secondary-action":
              "rounded-full border border-[#e6dfd8] bg-[#faf9f5] px-4 py-2 text-sm font-medium text-[#141413] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#cc785c]",
            "navbar-primary-action":
              "rounded-full bg-[#181715] px-5 py-2 text-sm font-medium text-[#faf9f5] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#252320]",
            "navbar-mobile-toggle":
              "ml-auto rounded-full border border-[#e6dfd8] text-[#141413]",
            "navbar-mobile-panel":
              "border-t border-[#e6dfd8] bg-[#faf9f5] px-4 py-4 shadow-none",
          }}
        />
      </Section>

      <Section
        id="section-hero"
        height={1020}
        rows={14}
        columns={22}
        columnGap={12}
        rowGap={12}
        responsive={{
          tablet: { columns: 12, rows: 18, height: 1120 },
          mobile: { columns: 4, rows: 20, height: 1180, columnGap: 10, rowGap: 10 },
        }}
        className="bg-[#faf9f5] px-8 py-8 max-sm:px-4 sm:max-lg:px-6"
      >
        <Text
          id="hero-kicker"
          content="2026 AUTUMN / WINTER EDIT"
          className="row-start-2 row-end-3 col-start-2 col-end-10 self-end text-[12px] font-medium uppercase tracking-[0.22em] text-[#6c6a64] sm:max-lg:col-start-1 sm:max-lg:col-end-8 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5"
        />
        <Text
          id="hero-title"
          content="高级日常衣橱，在整洁秩序里完成穿搭表达。"
          className="row-start-3 row-end-6 col-start-2 col-end-11 text-pretty font-[Georgia] text-[76px] font-normal leading-[0.95] tracking-[-0.06em] text-[#141413] sm:max-lg:row-start-2 sm:max-lg:row-end-5 sm:max-lg:col-start-1 sm:max-lg:col-end-10 sm:max-lg:text-[56px] max-sm:row-start-2 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5 max-sm:text-[34px] max-sm:leading-[1.02]"
        />
        <Text
          id="hero-copy"
          content="从通勤西装、柔软针织到周末轻户外，首页为你整理当季主线、热门单品与完整搭配场景。"
          className="row-start-6 row-end-8 col-start-2 col-end-9 text-[17px] leading-[1.7] text-[#3d3d3a] sm:max-lg:row-start-5 sm:max-lg:row-end-7 sm:max-lg:col-start-1 sm:max-lg:col-end-8 max-sm:row-start-5 max-sm:row-end-7 max-sm:col-start-1 max-sm:col-end-5 max-sm:text-[15px]"
        />
        <Button
          id="hero-button-primary"
          label="立即选购"
          className="row-start-8 row-end-9 col-start-2 col-end-5 h-12 self-start rounded-full bg-[#cc785c] px-6 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a9583e] sm:max-lg:row-start-7 sm:max-lg:row-end-8 sm:max-lg:col-start-1 sm:max-lg:col-end-4 max-sm:row-start-7 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-3"
        />
        <Button
          id="hero-button-secondary"
          label="查看新品"
          className="row-start-8 row-end-9 col-start-5 col-end-8 h-12 self-start rounded-full border border-[#e6dfd8] bg-[#faf9f5] px-6 text-sm font-medium text-[#141413] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#cc785c] sm:max-lg:row-start-7 sm:max-lg:row-end-8 sm:max-lg:col-start-4 sm:max-lg:col-end-7 max-sm:row-start-7 max-sm:row-end-8 max-sm:col-start-3 max-sm:col-end-5"
        />
        <Carousel
          id="hero-carousel"
          items={heroSlides}
          classNames={{
            carousel:
              "row-start-2 row-end-14 col-start-11 col-end-23 overflow-hidden rounded-[28px] bg-[#efe9de] shadow-[0_18px_60px_rgba(20,20,19,0.08)] sm:max-lg:row-start-9 sm:max-lg:row-end-17 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-9 max-sm:row-end-19 max-sm:col-start-1 max-sm:col-end-5",
            "carousel-content": "h-full",
            "carousel-item": "relative h-full",
            "carousel-item-img":
              "h-full w-full object-cover transition-transform duration-500 ease-out",
            "carousel-item-title":
              "absolute left-6 top-6 rounded-full bg-[#faf9f5]/90 px-4 py-2 font-sans text-xs font-medium uppercase tracking-[0.2em] text-[#141413] backdrop-blur max-sm:left-4 max-sm:top-4",
            "carousel-item-description":
              "absolute bottom-6 left-6 max-w-[320px] rounded-[20px] bg-[#181715] px-5 py-4 font-sans text-[15px] leading-[1.6] text-[#faf9f5] max-sm:left-4 max-sm:right-4 max-sm:bottom-4 max-sm:max-w-none",
            "carousel-previous":
              "left-6 top-auto bottom-6 h-11 w-11 -translate-y-0 rounded-full border border-white/30 bg-[#faf9f5]/90 text-[#141413] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white max-sm:hidden",
            "carousel-next":
              "right-6 left-auto top-auto bottom-6 h-11 w-11 -translate-y-0 rounded-full border border-white/30 bg-[#faf9f5]/90 text-[#141413] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white max-sm:hidden",
          }}
        />
      </Section>

      <Section
        id="section-promo"
        height={420}
        rows={6}
        columns={22}
        columnGap={12}
        rowGap={12}
        responsive={{
          tablet: { columns: 12, rows: 12, height: 660 },
          mobile: { columns: 4, rows: 14, height: 760, columnGap: 10, rowGap: 10 },
        }}
        className="bg-[#faf9f5] px-8 pb-8 max-sm:px-4 sm:max-lg:px-6"
      >
        <Card
          id="promo-main"
          title="会员福利周"
          description="全场满 999 减 180"
          content="首单免邮、积分双倍、秋冬精选套装专区同步开启。"
          buttonLabel="进入福利会场"
          classNames={{
            card:
              "row-start-1 row-end-7 col-start-1 col-end-12 rounded-[28px] bg-[#cc785c] p-8 text-white shadow-none transition-transform duration-200 hover:-translate-y-0.5 sm:max-lg:row-start-1 sm:max-lg:row-end-5 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5",
            "card-header": "space-y-3",
            "card-title":
              "font-[Georgia] text-[42px] font-normal leading-[1] tracking-[-0.05em] max-sm:text-[30px]",
            "card-description":
              "text-sm uppercase tracking-[0.2em] text-white/80",
            "card-content": "max-w-[420px] text-[16px] leading-[1.7] text-white/90",
            "card-footer": "mt-6",
            "card-action":
              "rounded-full bg-[#faf9f5] px-5 py-3 text-sm font-medium text-[#141413] transition-all duration-200 hover:-translate-y-0.5",
          }}
        />
        <Card
          id="promo-entry-one"
          title="限时闪促"
          description="48 小时"
          content="爆款外套、针织与鞋履单品低至 6 折。"
          buttonLabel="立即进入"
          classNames={{
            card:
              "row-start-1 row-end-4 col-start-12 col-end-17 rounded-[24px] border border-[#e6dfd8] bg-[#efe9de] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#cc785c] sm:max-lg:row-start-5 sm:max-lg:row-end-8 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-5 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5",
            "card-header": "space-y-2",
            "card-title": "font-[Georgia] text-[28px] leading-[1.05] tracking-[-0.04em]",
            "card-description": "text-xs uppercase tracking-[0.18em] text-[#6c6a64]",
            "card-content": "text-sm leading-[1.6] text-[#3d3d3a]",
            "card-footer": "mt-4",
            "card-action": "text-sm font-medium text-[#141413] underline underline-offset-4",
          }}
        />
        <Card
          id="promo-entry-two"
          title="搭配礼包"
          description="场景精选"
          content="通勤、假日、晚宴三类成套穿搭，一键购齐。"
          buttonLabel="查看指南"
          classNames={{
            card:
              "row-start-1 row-end-4 col-start-17 col-end-23 rounded-[24px] border border-[#e6dfd8] bg-[#181715] p-6 text-[#faf9f5] transition-all duration-200 hover:-translate-y-0.5 sm:max-lg:row-start-5 sm:max-lg:row-end-8 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-8 max-sm:row-end-11 max-sm:col-start-1 max-sm:col-end-5",
            "card-header": "space-y-2",
            "card-title": "font-[Georgia] text-[28px] leading-[1.05] tracking-[-0.04em]",
            "card-description": "text-xs uppercase tracking-[0.18em] text-[#a09d96]",
            "card-content": "text-sm leading-[1.6] text-[#faf9f5]/80",
            "card-footer": "mt-4",
            "card-action": "text-sm font-medium text-[#faf9f5] underline underline-offset-4",
          }}
        />
        <Text
          id="promo-note"
          content="优惠入口、会员权益与新品福利按场景集中整理，减少无效浏览。"
          className="row-start-5 row-end-6 col-start-12 col-end-23 self-end text-right text-[13px] tracking-[0.04em] text-[#8e8b82] sm:max-lg:row-start-9 sm:max-lg:row-end-10 sm:max-lg:col-start-1 sm:max-lg:col-end-13 sm:max-lg:text-left max-sm:row-start-11 max-sm:row-end-12 max-sm:col-start-1 max-sm:col-end-5 max-sm:text-left"
        />
      </Section>

      <Section
        id="section-products"
        height={1260}
        rows={18}
        columns={22}
        columnGap={12}
        rowGap={12}
        responsive={{
          tablet: { columns: 12, rows: 26, height: 1960 },
          mobile: { columns: 4, rows: 38, height: 3160, columnGap: 10, rowGap: 10 },
        }}
        className="bg-[#f5f0e8] px-8 py-10 max-sm:px-4 sm:max-lg:px-6"
      >
        <Text
          id="products-kicker"
          content="SHOP BY Curation"
          className="row-start-1 row-end-2 col-start-2 col-end-8 self-end text-[12px] font-medium uppercase tracking-[0.22em] text-[#6c6a64] sm:max-lg:col-start-1 sm:max-lg:col-end-6 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5"
        />
        <Text
          id="products-title"
          content="分类穿搭、爆款推荐与新品上架，用卡片视图快速完成挑选。"
          className="row-start-2 row-end-4 col-start-2 col-end-13 font-[Georgia] text-[48px] font-normal leading-[1.08] tracking-[-0.05em] text-[#141413] sm:max-lg:col-start-1 sm:max-lg:col-end-10 sm:max-lg:text-[40px] max-sm:row-start-2 max-sm:row-end-4 max-sm:col-start-1 max-sm:col-end-5 max-sm:text-[30px]"
        />
        <Text
          id="products-copy"
          content="主打清晰的商品编排：每张卡片只保留足够决定购买的信息，搭配状态通过文案标签快速识别。"
          className="row-start-2 row-end-4 col-start-15 col-end-22 self-end text-[16px] leading-[1.7] text-[#3d3d3a] sm:max-lg:row-start-4 sm:max-lg:row-end-6 sm:max-lg:col-start-1 sm:max-lg:col-end-10 max-sm:row-start-4 max-sm:row-end-6 max-sm:col-start-1 max-sm:col-end-5 max-sm:text-[15px]"
        />
        <Card
          id="product-card-trench"
          imgSrc="https://picsum.photos/id/1060/900/1100"
          imgAlt="米色长风衣商品图"
          title="气质长风衣"
          description="都市通勤"
          content="双排扣剪裁，防风挺括，适配衬衫与针织叠穿。"
          buttonLabel="加入购物车"
          classNames={{
            card:
              "row-start-5 row-end-12 col-start-2 col-end-8 overflow-hidden rounded-[24px] border border-[#e6dfd8] bg-[#faf9f5] transition-all duration-200 hover:-translate-y-1 hover:border-[#cc785c] sm:max-lg:row-start-7 sm:max-lg:row-end-14 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-7 max-sm:row-end-13 max-sm:col-start-1 max-sm:col-end-5",
            "card-img": "h-[58%] w-full object-cover",
            "card-header": "space-y-2 px-5 pt-5",
            "card-title":
              "font-[Georgia] text-[28px] leading-[1.05] tracking-[-0.04em] text-[#141413]",
            "card-description":
              "text-xs uppercase tracking-[0.18em] text-[#6c6a64]",
            "card-content": "px-5 pt-3 text-[15px] leading-[1.65] text-[#3d3d3a]",
            "card-footer": "px-5 pb-5 pt-5",
            "card-action":
              "w-full rounded-full bg-[#181715] px-4 py-3 text-sm font-medium text-[#faf9f5] transition-all duration-200 hover:bg-[#252320]",
          }}
        />
        <Card
          id="product-card-knit"
          imgSrc="https://picsum.photos/id/1025/900/1100"
          imgAlt="浅色羊毛针织衫商品图"
          title="羊毛针织套衫"
          description="爆款推荐"
          content="柔软触感与低饱和配色，单穿内搭都利落。"
          buttonLabel="查看详情"
          classNames={{
            card:
              "row-start-5 row-end-12 col-start-8 col-end-14 overflow-hidden rounded-[24px] border border-[#e6dfd8] bg-[#faf9f5] transition-all duration-200 hover:-translate-y-1 hover:border-[#cc785c] sm:max-lg:row-start-7 sm:max-lg:row-end-14 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-13 max-sm:row-end-19 max-sm:col-start-1 max-sm:col-end-5",
            "card-img": "h-[58%] w-full object-cover",
            "card-header": "space-y-2 px-5 pt-5",
            "card-title":
              "font-[Georgia] text-[28px] leading-[1.05] tracking-[-0.04em] text-[#141413]",
            "card-description":
              "text-xs uppercase tracking-[0.18em] text-[#6c6a64]",
            "card-content": "px-5 pt-3 text-[15px] leading-[1.65] text-[#3d3d3a]",
            "card-footer": "px-5 pb-5 pt-5",
            "card-action":
              "w-full rounded-full bg-[#181715] px-4 py-3 text-sm font-medium text-[#faf9f5] transition-all duration-200 hover:bg-[#252320]",
          }}
        />
        <Card
          id="product-card-dress"
          imgSrc="https://picsum.photos/id/1074/900/1100"
          imgAlt="垂感长裙商品图"
          title="垂感长裙"
          description="新品上架"
          content="轻盈面料配合高腰线设计，适合约会与出行。"
          buttonLabel="立即选购"
          classNames={{
            card:
              "row-start-5 row-end-12 col-start-14 col-end-20 overflow-hidden rounded-[24px] border border-[#e6dfd8] bg-[#faf9f5] transition-all duration-200 hover:-translate-y-1 hover:border-[#cc785c] sm:max-lg:row-start-14 sm:max-lg:row-end-21 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-19 max-sm:row-end-25 max-sm:col-start-1 max-sm:col-end-5",
            "card-img": "h-[58%] w-full object-cover",
            "card-header": "space-y-2 px-5 pt-5",
            "card-title":
              "font-[Georgia] text-[28px] leading-[1.05] tracking-[-0.04em] text-[#141413]",
            "card-description":
              "text-xs uppercase tracking-[0.18em] text-[#6c6a64]",
            "card-content": "px-5 pt-3 text-[15px] leading-[1.65] text-[#3d3d3a]",
            "card-footer": "px-5 pb-5 pt-5",
            "card-action":
              "w-full rounded-full bg-[#181715] px-4 py-3 text-sm font-medium text-[#faf9f5] transition-all duration-200 hover:bg-[#252320]",
          }}
        />
        <Card
          id="product-card-denim"
          imgSrc="https://picsum.photos/id/1050/900/1100"
          imgAlt="直筒牛仔裤商品图"
          title="直筒牛仔裤"
          description="日常百搭"
          content="经典中腰版型，配合西装、T 恤都自然有型。"
          buttonLabel="立即选购"
          classNames={{
            card:
              "row-start-12 row-end-19 col-start-2 col-end-8 overflow-hidden rounded-[24px] border border-[#e6dfd8] bg-[#faf9f5] transition-all duration-200 hover:-translate-y-1 hover:border-[#cc785c] sm:max-lg:row-start-14 sm:max-lg:row-end-21 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-25 max-sm:row-end-31 max-sm:col-start-1 max-sm:col-end-5",
            "card-img": "h-[58%] w-full object-cover",
            "card-header": "space-y-2 px-5 pt-5",
            "card-title":
              "font-[Georgia] text-[28px] leading-[1.05] tracking-[-0.04em] text-[#141413]",
            "card-description":
              "text-xs uppercase tracking-[0.18em] text-[#6c6a64]",
            "card-content": "px-5 pt-3 text-[15px] leading-[1.65] text-[#3d3d3a]",
            "card-footer": "px-5 pb-5 pt-5",
            "card-action":
              "w-full rounded-full bg-[#181715] px-4 py-3 text-sm font-medium text-[#faf9f5] transition-all duration-200 hover:bg-[#252320]",
          }}
        />
        <Card
          id="product-card-blazer"
          imgSrc="https://picsum.photos/id/1011/900/1100"
          imgAlt="宽肩西装外套商品图"
          title="宽肩西装外套"
          description="穿搭分类"
          content="微廓形结构感，适合打造利落高级的城市风格。"
          buttonLabel="查看详情"
          classNames={{
            card:
              "row-start-12 row-end-19 col-start-8 col-end-14 overflow-hidden rounded-[24px] border border-[#e6dfd8] bg-[#faf9f5] transition-all duration-200 hover:-translate-y-1 hover:border-[#cc785c] sm:max-lg:row-start-21 sm:max-lg:row-end-28 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-31 max-sm:row-end-37 max-sm:col-start-1 max-sm:col-end-5",
            "card-img": "h-[58%] w-full object-cover",
            "card-header": "space-y-2 px-5 pt-5",
            "card-title":
              "font-[Georgia] text-[28px] leading-[1.05] tracking-[-0.04em] text-[#141413]",
            "card-description":
              "text-xs uppercase tracking-[0.18em] text-[#6c6a64]",
            "card-content": "px-5 pt-3 text-[15px] leading-[1.65] text-[#3d3d3a]",
            "card-footer": "px-5 pb-5 pt-5",
            "card-action":
              "w-full rounded-full bg-[#181715] px-4 py-3 text-sm font-medium text-[#faf9f5] transition-all duration-200 hover:bg-[#252320]",
          }}
        />
        <Card
          id="product-card-bag"
          imgSrc="https://picsum.photos/id/103/900/1100"
          imgAlt="皮质通勤包商品图"
          title="皮质通勤包"
          description="配饰精选"
          content="大容量与极简轮廓平衡，适配工作与周末双场景。"
          buttonLabel="加入购物车"
          classNames={{
            card:
              "row-start-12 row-end-19 col-start-14 col-end-20 overflow-hidden rounded-[24px] border border-[#e6dfd8] bg-[#faf9f5] transition-all duration-200 hover:-translate-y-1 hover:border-[#cc785c] sm:max-lg:row-start-21 sm:max-lg:row-end-28 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-37 max-sm:row-end-43 max-sm:col-start-1 max-sm:col-end-5",
            "card-img": "h-[58%] w-full object-cover",
            "card-header": "space-y-2 px-5 pt-5",
            "card-title":
              "font-[Georgia] text-[28px] leading-[1.05] tracking-[-0.04em] text-[#141413]",
            "card-description":
              "text-xs uppercase tracking-[0.18em] text-[#6c6a64]",
            "card-content": "px-5 pt-3 text-[15px] leading-[1.65] text-[#3d3d3a]",
            "card-footer": "px-5 pb-5 pt-5",
            "card-action":
              "w-full rounded-full bg-[#181715] px-4 py-3 text-sm font-medium text-[#faf9f5] transition-all duration-200 hover:bg-[#252320]",
          }}
        />
      </Section>

      <Section
        id="section-content"
        height={840}
        rows={10}
        columns={22}
        columnGap={12}
        rowGap={12}
        responsive={{
          tablet: { columns: 12, rows: 18, height: 1160 },
          mobile: { columns: 4, rows: 20, height: 1360, columnGap: 10, rowGap: 10 },
        }}
        className="bg-[#faf9f5] px-8 py-10 max-sm:px-4 sm:max-lg:px-6"
      >
        <Text
          id="content-title"
          content="穿搭场景与搭配指南，帮助用户从“看商品”过渡到“会搭配”。"
          className="row-start-1 row-end-3 col-start-2 col-end-12 font-[Georgia] text-[46px] font-normal leading-[1.1] tracking-[-0.05em] text-[#141413] sm:max-lg:col-start-1 sm:max-lg:col-end-10 sm:max-lg:text-[38px] max-sm:row-start-1 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5 max-sm:text-[30px]"
        />
        <Card
          id="content-scene"
          title="通勤场景"
          description="Scene Styling"
          content="用长风衣、针织、直筒裤建立稳重但不沉闷的工作日着装。强调色彩克制、轮廓干净与单品复用率。"
          buttonLabel="查看完整穿搭"
          imgSrc="https://picsum.photos/id/1001/1200/900"
          imgAlt="通勤穿搭场景模特展示"
          classNames={{
            card:
              "row-start-4 row-end-11 col-start-2 col-end-12 overflow-hidden rounded-[28px] bg-[#181715] text-[#faf9f5] transition-all duration-200 hover:-translate-y-1 sm:max-lg:row-start-4 sm:max-lg:row-end-10 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-4 max-sm:row-end-10 max-sm:col-start-1 max-sm:col-end-5",
            "card-img": "h-[56%] w-full object-cover opacity-90",
            "card-header": "space-y-2 px-6 pt-5",
            "card-title": "font-[Georgia] text-[34px] leading-[1.05] tracking-[-0.04em]",
            "card-description": "text-xs uppercase tracking-[0.18em] text-[#a09d96]",
            "card-content": "px-6 pt-3 text-[15px] leading-[1.7] text-[#faf9f5]/85",
            "card-footer": "px-6 pb-6 pt-5",
            "card-action":
              "rounded-full bg-[#faf9f5] px-5 py-3 text-sm font-medium text-[#141413]",
          }}
        />
        <Card
          id="content-guide"
          title="叠穿指南"
          description="Mix & Match"
          content="从衬衫与背心、针织与西装，到配饰的层次建立，按步骤提供更直观的搭配建议。"
          buttonLabel="阅读指南"
          imgSrc="https://picsum.photos/id/1012/1200/900"
          imgAlt="服装叠穿指南商品场景图"
          classNames={{
            card:
              "row-start-4 row-end-11 col-start-13 col-end-22 overflow-hidden rounded-[28px] border border-[#e6dfd8] bg-[#efe9de] transition-all duration-200 hover:-translate-y-1 sm:max-lg:row-start-10 sm:max-lg:row-end-16 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-10 max-sm:row-end-16 max-sm:col-start-1 max-sm:col-end-5",
            "card-img": "h-[56%] w-full object-cover",
            "card-header": "space-y-2 px-6 pt-5",
            "card-title":
              "font-[Georgia] text-[34px] leading-[1.05] tracking-[-0.04em] text-[#141413]",
            "card-description": "text-xs uppercase tracking-[0.18em] text-[#6c6a64]",
            "card-content": "px-6 pt-3 text-[15px] leading-[1.7] text-[#3d3d3a]",
            "card-footer": "px-6 pb-6 pt-5",
            "card-action": "text-sm font-medium text-[#141413] underline underline-offset-4",
          }}
        />
      </Section>

      <Section
        id="section-footer"
        height={380}
        rows={6}
        columns={22}
        columnGap={12}
        rowGap={12}
        responsive={{
          tablet: { columns: 12, rows: 10, height: 520 },
          mobile: { columns: 4, rows: 14, height: 700, columnGap: 10, rowGap: 10 },
        }}
        className="bg-[#181715] px-8 py-10 text-[#faf9f5] max-sm:px-4 sm:max-lg:px-6"
      >
        <Text
          id="footer-brand"
          content="MORÉVA"
          className="row-start-1 row-end-2 col-start-2 col-end-6 font-[Georgia] text-[32px] tracking-[-0.05em] text-[#faf9f5] sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5"
        />
        <Text
          id="footer-brand-copy"
          content="以克制而高级的服装策展方式，帮助用户在一个首页里完成灵感获取、活动浏览与高效购买。"
          className="row-start-2 row-end-4 col-start-2 col-end-8 text-[14px] leading-[1.7] text-[#a09d96] sm:max-lg:col-start-1 sm:max-lg:col-end-6 max-sm:row-start-2 max-sm:row-end-4 max-sm:col-start-1 max-sm:col-end-5"
        />
        <Text
          id="footer-service"
          content={"客服支持\n在线时间 09:00 - 23:00\n400-800-2026"}
          className="row-start-1 row-end-4 col-start-10 col-end-13 whitespace-pre-line text-[14px] leading-[1.8] text-[#faf9f5] sm:max-lg:col-start-7 sm:max-lg:col-end-10 max-sm:row-start-4 max-sm:row-end-6 max-sm:col-start-1 max-sm:col-end-5"
        />
        <Text
          id="footer-after-sales"
          content={"售后服务\n7 天无忧退换\n订单追踪与发票"}
          className="row-start-1 row-end-4 col-start-14 col-end-17 whitespace-pre-line text-[14px] leading-[1.8] text-[#faf9f5] sm:max-lg:col-start-10 sm:max-lg:col-end-13 max-sm:row-start-6 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5"
        />
        <Text
          id="footer-links"
          content={"导航链接\n新品上架\n热销榜单\n场景搭配\n会员中心"}
          className="row-start-1 row-end-5 col-start-18 col-end-22 whitespace-pre-line text-[14px] leading-[1.8] text-[#faf9f5] sm:max-lg:row-start-5 sm:max-lg:row-end-8 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-8 max-sm:row-end-12 max-sm:col-start-1 max-sm:col-end-5"
        />
        <Text
          id="footer-bottom"
          content="© 2026 MORÉVA. All rights reserved."
          className="row-start-5 row-end-6 col-start-2 col-end-8 self-end text-[12px] uppercase tracking-[0.16em] text-[#8e8b82] sm:max-lg:row-start-8 sm:max-lg:row-end-9 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-12 max-sm:row-end-13 max-sm:col-start-1 max-sm:col-end-5"
        />
      </Section>
    </Root>
  );
}