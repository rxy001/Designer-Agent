import { Button, Card, Carousel, Divider, Image, Navbar, Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-[#faf7f2] text-[#181512] [font-family:Georgia,'Times New Roman',serif]">
      <Section id="nav-section" columns={22} rows={2} height={92} columnGap={8} rowGap={8} responsive={{
        tablet: {
          columns: 12,
          rows: 2,
          height: 92
        },
        mobile: {
          columns: 4,
          rows: 2,
          height: 92
        }
      }} className="border-b border-[#e8dfd2] bg-[#faf7f2]">
        <Navbar brand="AURELIA" logoSrc="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=120&q=80" logoAlt="AURELIA 品牌标志" sticky items={[
          {
            label: "女装",
            href: "#products-section",
            active: true
          },
          {
            label: "男装",
            href: "#products-section"
          },
          {
            label: "配饰",
            href: "#products-section"
          },
          {
            label: "新品",
            href: "#products-section"
          },
          {
            label: "穿搭灵感",
            href: "#content-section"
          }
        ]} primaryAction={{
          label: "购物车",
          href: "#footer-section"
        }} secondaryAction={{
          label: "搜索",
          href: "#hero-section"
        }} classNames={{
          navbar: "sticky top-0 border-none bg-[#faf7f2]/95 backdrop-blur-md row-start-1 row-end-3 col-start-1 col-end-23 z-50 sm:max-lg:row-start-1 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5",
          "navbar-inner": "h-full px-8 sm:max-lg:px-6 max-sm:px-4 py-4",
          "navbar-logo": "h-9 w-9 rounded-full object-cover ring-1 ring-[#e8dfd2]",
          "navbar-brand": "gap-3 text-[0.95rem] font-semibold tracking-[0.35em] text-[#181512] [font-family:Inter,ui-sans-serif,sans-serif]",
          "navbar-nav-list": "justify-center gap-1",
          "navbar-nav-item": "rounded-full px-4 py-2 text-[0.88rem] font-medium text-[#6a6257] transition-all duration-200 hover:bg-[#efe7db] hover:text-[#181512] [font-family:Inter,ui-sans-serif,sans-serif]",
          "navbar-active-nav-item": "bg-[#efe7db] text-[#181512]",
          "navbar-actions": "gap-2",
          "navbar-primary-action": "rounded-full bg-[#1e1a16] px-5 py-2 text-[0.82rem] font-semibold text-[#faf7f2] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3a2f28] [font-family:Inter,ui-sans-serif,sans-serif]",
          "navbar-secondary-action": "rounded-full border border-[#e3d8c8] bg-[#fffdf9] px-4 py-2 text-[0.82rem] font-medium text-[#181512] transition-all duration-200 hover:bg-[#f3ece3] [font-family:Inter,ui-sans-serif,sans-serif]",
          "navbar-mobile-toggle": "ml-auto h-10 w-10 rounded-full border border-[#e3d8c8] text-[#181512]",
          "navbar-mobile-panel": "border-t border-[#e8dfd2] bg-[#faf7f2] px-4 py-4 shadow-none"
        }} id="top-navbar" />
      </Section>

      <Section id="hero-section" columns={22} rows={12} height={980} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 14,
          height: 980
        },
        mobile: {
          columns: 4,
          rows: 18,
          height: 1080,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#f6f1e8] px-6 py-6 sm:max-lg:px-4 max-sm:px-3">
        <Carousel items={[
          {
            imgSrc: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "女模特身穿秋冬都市风套装站在极简空间内",
            title: "",
            description: ""
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "模特展示层次感针织与长外套穿搭",
            title: "",
            description: ""
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "模特身穿轻奢休闲系列站在自然光场景中",
            title: "",
            description: ""
          }
        ]} classNames={{
          carousel: "h-full overflow-hidden rounded-[28px] border border-[#e6ddd0] bg-[#eae2d6] shadow-[0_20px_60px_rgba(65,47,31,0.08)] row-start-1 row-end-13 col-start-1 col-end-23 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-15 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-17 max-sm:col-start-1 max-sm:col-end-5",
          "carousel-content": "h-full",
          "carousel-item": "relative h-full",
          "carousel-item-img": "h-full w-full object-cover",
          "carousel-item-title": "absolute left-10 top-12 max-w-[42rem] text-6xl font-medium leading-[0.95] tracking-[-0.04em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.28)] sm:max-lg:left-8 sm:max-lg:top-10 sm:max-lg:text-5xl max-sm:left-5 max-sm:top-8 max-sm:max-w-[16rem] max-sm:text-3xl",
          "carousel-item-description": "absolute left-10 top-40 max-w-xl text-base leading-7 text-white/92 drop-shadow-[0_8px_18px_rgba(0,0,0,0.22)] [font-family:Inter,ui-sans-serif,sans-serif] sm:max-lg:left-8 sm:max-lg:top-32 sm:max-lg:max-w-md max-sm:left-5 max-sm:top-28 max-sm:max-w-[15rem] max-sm:text-sm max-sm:leading-6",
          "carousel-previous": "left-6 h-12 w-12 -translate-y-1/2 rounded-full border border-white/35 bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 max-sm:left-3 max-sm:h-10 max-sm:w-10",
          "carousel-next": "right-6 h-12 w-12 -translate-y-1/2 rounded-full border border-white/35 bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 max-sm:right-3 max-sm:h-10 max-sm:w-10"
        }} id="hero-carousel" />
        <Text content="AW24 COLLECTION" className="self-start text-[0.78rem] font-semibold tracking-[0.36em] text-white [font-family:Inter,ui-sans-serif,sans-serif] row-start-2 row-end-3 col-start-2 col-end-7 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-2 sm:max-lg:col-end-7 max-sm:row-start-2 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-4" id="hero-kicker" />
        <Text content="满 999 减 180 · 新会员首单包邮" className="self-end rounded-full bg-white/18 px-5 py-3 text-sm font-medium text-white backdrop-blur-md [font-family:Inter,ui-sans-serif,sans-serif] row-start-10 row-end-11 col-start-2 col-end-8 z-1 sm:max-lg:row-start-11 sm:max-lg:row-end-12 sm:max-lg:col-start-2 sm:max-lg:col-end-8 max-sm:row-start-13 max-sm:row-end-14 max-sm:col-start-1 max-sm:col-end-5" id="hero-promo" />
        <Button label="选购主推系列" type="button" className="h-12 self-start rounded-full bg-[#cc785c] px-6 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(204,120,92,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a9583e] [font-family:Inter,ui-sans-serif,sans-serif] row-start-11 row-end-12 col-start-2 col-end-5 z-1 sm:max-lg:row-start-12 sm:max-lg:row-end-13 sm:max-lg:col-start-2 sm:max-lg:col-end-5 max-sm:row-start-15 max-sm:row-end-16 max-sm:col-start-1 max-sm:col-end-3" id="hero-primary-cta" />
        <Button label="查看活动日历" type="button" className="h-12 self-start rounded-full border border-white/40 bg-white/14 px-6 text-sm font-semibold text-white backdrop-blur-md transition-all duration-200 hover:bg-white/22 [font-family:Inter,ui-sans-serif,sans-serif] row-start-11 row-end-12 col-start-5 col-end-8 z-1 sm:max-lg:row-start-12 sm:max-lg:row-end-13 sm:max-lg:col-start-5 sm:max-lg:col-end-8 max-sm:row-start-15 max-sm:row-end-16 max-sm:col-start-3 max-sm:col-end-5" id="hero-secondary-cta" />
      </Section>

      <Section id="promo-section" columns={22} rows={5} height={360} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 8,
          height: 548
        },
        mobile: {
          columns: 4,
          rows: 12,
          height: 868
        }
      }} className="px-6 py-8 sm:max-lg:px-4 max-sm:px-3">
        <Card title="会员福利日" description="积分翻倍 · 专属券包 · 门店同享" content="本周开通会员即可领取 120 元券包，并享受当季新品优先购。" buttonLabel="立即领取" classNames={{
          card: "rounded-[24px] bg-[#c9755c] p-8 text-white shadow-[0_18px_40px_rgba(201,117,92,0.2)] row-start-1 row-end-6 col-start-1 col-end-11 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-5 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5",
          "card-header": "space-y-3",
          "card-title": "text-4xl font-medium tracking-[-0.03em] max-sm:text-3xl",
          "card-description": "text-sm font-semibold tracking-[0.24em] text-white/80 [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-6 max-w-md text-base leading-7 text-white/90 [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-8",
          "card-action": "rounded-full bg-[#faf7f2] px-5 py-3 text-sm font-semibold text-[#181512] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="promo-main" />
        <Card title="折扣专区" description="精选低至 6 折" content="大衣、针织、鞋履分会场直达，快速进入热卖品类。" buttonLabel="进入会场" classNames={{
          card: "rounded-[24px] border border-[#e7ddcf] bg-[#efe7db] p-7 text-[#181512] row-start-1 row-end-6 col-start-11 col-end-17 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-9 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-5 max-sm:row-end-9 max-sm:col-start-1 max-sm:col-end-5",
          "card-header": "space-y-2",
          "card-title": "text-2xl font-medium tracking-[-0.03em]",
          "card-description": "text-sm uppercase tracking-[0.18em] text-[#8a7765] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-5 text-sm leading-6 text-[#4b433b] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-7",
          "card-action": "rounded-full bg-[#1e1a16] px-4 py-2.5 text-sm font-semibold text-[#faf7f2] transition hover:bg-[#342b24] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="promo-coupon" />
        <Card title="搭配顾问" description="一对一在线推荐" content="根据场景、色系和预算，快速生成你的本周穿搭清单。" buttonLabel="开始咨询" classNames={{
          card: "rounded-[24px] border border-[#e7ddcf] bg-[#fffdf9] p-7 text-[#181512] row-start-1 row-end-6 col-start-17 col-end-23 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-9 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-9 max-sm:row-end-13 max-sm:col-start-1 max-sm:col-end-5",
          "card-header": "space-y-2",
          "card-title": "text-2xl font-medium tracking-[-0.03em]",
          "card-description": "text-sm uppercase tracking-[0.18em] text-[#8a7765] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-5 text-sm leading-6 text-[#4b433b] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-7",
          "card-action": "rounded-full border border-[#dfd3c3] bg-transparent px-4 py-2.5 text-sm font-semibold text-[#181512] transition hover:bg-[#f2eadf] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="promo-service" />
      </Section>

      <Section id="products-section" columns={22} rows={22} height={1960} columnGap={12} rowGap={14} responsive={{
        tablet: {
          columns: 12,
          rows: 44,
          height: 4210
        },
        mobile: {
          columns: 4,
          rows: 52,
          height: 6100
        }
      }} className="px-6 py-10 sm:max-lg:px-4 max-sm:px-3">
        <Text content="按风格与热度选购" className="text-5xl font-medium tracking-[-0.04em] text-[#181512] max-sm:text-3xl row-start-1 row-end-2 col-start-1 col-end-9 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-8 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="products-title" />
        <Text content="从分类穿搭、爆款推荐到本周新品，以清晰网格浏览完整衣橱提案。" className="text-base leading-7 text-[#574f46] [font-family:Inter,ui-sans-serif,sans-serif] row-start-2 row-end-3 col-start-1 col-end-11 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-10 max-sm:row-start-2 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5" id="products-subtitle" />
        <Card imgSrc="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80" imgAlt="都市通勤风格女装搭配展示" title="都市通勤" description="挺括西装、柔雾衬衫与高腰长裤，适合高频出行与办公室切换。" content="精选 28 款高复购单品，支持套装搭配购买。" buttonLabel="查看系列" classNames={{
          card: "rounded-[22px] border border-[#eadfce] bg-[#fffdf9] p-4 shadow-[0_8px_24px_rgba(40,26,16,0.04)] row-start-4 row-end-10 col-start-1 col-end-8 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-10 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-4 max-sm:row-end-9 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-64 w-full rounded-[18px] object-cover max-sm:h-52",
          "card-header": "mt-4 space-y-2",
          "card-title": "text-[1.7rem] font-medium tracking-[-0.03em] text-[#181512]",
          "card-description": "text-sm leading-6 text-[#5f564d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-3 text-sm leading-6 text-[#8a7765] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-5",
          "card-action": "rounded-full bg-[#181512] px-4 py-2.5 text-sm font-semibold text-[#faf7f2] transition hover:bg-[#352d27] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="look-city" />
        <Card imgSrc="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80" imgAlt="周末松弛感服装搭配展示" title="周末松弛感" description="轻软针织、牛仔与休闲外套，兼顾舒适与镜头感。" content="适合短途出游与咖啡约会的轻装搭配。" buttonLabel="即刻选购" classNames={{
          card: "rounded-[22px] border border-[#eadfce] bg-[#fffdf9] p-4 shadow-[0_8px_24px_rgba(40,26,16,0.04)] row-start-4 row-end-10 col-start-8 col-end-15 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-10 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-9 max-sm:row-end-14 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-64 w-full rounded-[18px] object-cover max-sm:h-52",
          "card-header": "mt-4 space-y-2",
          "card-title": "text-[1.7rem] font-medium tracking-[-0.03em] text-[#181512]",
          "card-description": "text-sm leading-6 text-[#5f564d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-3 text-sm leading-6 text-[#8a7765] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-5",
          "card-action": "rounded-full bg-[#181512] px-4 py-2.5 text-sm font-semibold text-[#faf7f2] transition hover:bg-[#352d27] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="look-weekend" />
        <Card imgSrc="https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80" imgAlt="晚间聚会服装搭配展示" title="晚间聚会" description="缎面、修身剪裁与低调光泽，让晚间造型更有层次。" content="连衣裙与外套组合可一键加入购物车。" buttonLabel="浏览新品" classNames={{
          card: "rounded-[22px] border border-[#eadfce] bg-[#fffdf9] p-4 shadow-[0_8px_24px_rgba(40,26,16,0.04)] row-start-4 row-end-10 col-start-15 col-end-23 z-1 sm:max-lg:row-start-10 sm:max-lg:row-end-16 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-14 max-sm:row-end-19 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-64 w-full rounded-[18px] object-cover max-sm:h-52",
          "card-header": "mt-4 space-y-2",
          "card-title": "text-[1.7rem] font-medium tracking-[-0.03em] text-[#181512]",
          "card-description": "text-sm leading-6 text-[#5f564d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-3 text-sm leading-6 text-[#8a7765] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-5",
          "card-action": "rounded-full bg-[#181512] px-4 py-2.5 text-sm font-semibold text-[#faf7f2] transition hover:bg-[#352d27] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="look-evening" />
        <Text content="爆款推荐" className="text-3xl font-medium tracking-[-0.03em] text-[#181512] row-start-10 row-end-11 col-start-1 col-end-6 z-1 sm:max-lg:row-start-17 sm:max-lg:row-end-18 sm:max-lg:col-start-1 sm:max-lg:col-end-6 max-sm:row-start-19 max-sm:row-end-20 max-sm:col-start-1 max-sm:col-end-5" id="bestseller-label" />
        <Card imgSrc="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80" imgAlt="羊毛双面呢大衣产品图" title="羊毛双面呢大衣" description="爆款推荐" content="柔沙驼色 · 双面工艺 · ¥1,299" buttonLabel="加入购物车" classNames={{
          card: "rounded-[20px] border border-[#eadfce] bg-[#f7f2ea] p-4 row-start-11 row-end-16 col-start-1 col-end-6 z-1 sm:max-lg:row-start-18 sm:max-lg:row-end-23 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-20 max-sm:row-end-24 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-52 w-full rounded-[16px] object-cover",
          "card-header": "mt-4 space-y-2",
          "card-title": "text-xl font-medium tracking-[-0.02em] text-[#181512]",
          "card-description": "text-xs font-semibold uppercase tracking-[0.18em] text-[#9a846d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-2 text-sm leading-6 text-[#5f564d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-4",
          "card-action": "rounded-full border border-[#ddcfbc] bg-white px-4 py-2.5 text-sm font-semibold text-[#181512] transition hover:bg-[#efe5d8] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="best-coat" />
        <Card imgSrc="https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80" imgAlt="细针美利奴针织衫产品图" title="细针美利奴针织衫" description="口碑单品" content="奶油白 · 修身版型 · ¥399" buttonLabel="立即购买" classNames={{
          card: "rounded-[20px] border border-[#eadfce] bg-[#f7f2ea] p-4 row-start-11 row-end-16 col-start-6 col-end-11 z-1 sm:max-lg:row-start-18 sm:max-lg:row-end-23 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-24 max-sm:row-end-28 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-52 w-full rounded-[16px] object-cover",
          "card-header": "mt-4 space-y-2",
          "card-title": "text-xl font-medium tracking-[-0.02em] text-[#181512]",
          "card-description": "text-xs font-semibold uppercase tracking-[0.18em] text-[#9a846d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-2 text-sm leading-6 text-[#5f564d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-4",
          "card-action": "rounded-full border border-[#ddcfbc] bg-white px-4 py-2.5 text-sm font-semibold text-[#181512] transition hover:bg-[#efe5d8] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="best-knit" />
        <Card imgSrc="https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80" imgAlt="复古腋下包产品图" title="复古腋下包" description="人气配饰" content="深棕皮质 · 日常百搭 · ¥569" buttonLabel="查看详情" classNames={{
          card: "rounded-[20px] border border-[#eadfce] bg-[#f7f2ea] p-4 row-start-11 row-end-16 col-start-11 col-end-16 z-1 sm:max-lg:row-start-23 sm:max-lg:row-end-28 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-28 max-sm:row-end-32 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-52 w-full rounded-[16px] object-cover",
          "card-header": "mt-4 space-y-2",
          "card-title": "text-xl font-medium tracking-[-0.02em] text-[#181512]",
          "card-description": "text-xs font-semibold uppercase tracking-[0.18em] text-[#9a846d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-2 text-sm leading-6 text-[#5f564d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-4",
          "card-action": "rounded-full border border-[#ddcfbc] bg-white px-4 py-2.5 text-sm font-semibold text-[#181512] transition hover:bg-[#efe5d8] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="best-bag" />
        <Card imgSrc="https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80" imgAlt="垂感缎面连衣裙产品图" title="垂感缎面连衣裙" description="高收藏款" content="墨黑色 · 可单穿可叠搭 · ¥699" buttonLabel="查看详情" classNames={{
          card: "rounded-[20px] border border-[#eadfce] bg-[#f7f2ea] p-4 row-start-11 row-end-16 col-start-16 col-end-23 z-1 sm:max-lg:row-start-23 sm:max-lg:row-end-28 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-32 max-sm:row-end-36 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-52 w-full rounded-[16px] object-cover",
          "card-header": "mt-4 space-y-2",
          "card-title": "text-xl font-medium tracking-[-0.02em] text-[#181512]",
          "card-description": "text-xs font-semibold uppercase tracking-[0.18em] text-[#9a846d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-2 text-sm leading-6 text-[#5f564d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-4",
          "card-action": "rounded-full border border-[#ddcfbc] bg-white px-4 py-2.5 text-sm font-semibold text-[#181512] transition hover:bg-[#efe5d8] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="best-dress" />
        <Text content="新品上架" className="text-3xl font-medium tracking-[-0.03em] text-[#181512] row-start-16 row-end-17 col-start-1 col-end-6 z-1 sm:max-lg:row-start-29 sm:max-lg:row-end-30 sm:max-lg:col-start-1 sm:max-lg:col-end-6 max-sm:row-start-37 max-sm:row-end-38 max-sm:col-start-1 max-sm:col-end-5" id="newarrival-label" />
        <Card imgSrc="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80" imgAlt="短款机车外套产品图" title="短款机车外套" description="新品上架" content="利落肩线 · 深咖啡色 · ¥899" buttonLabel="抢先预览" classNames={{
          card: "rounded-[20px] border border-[#eadfce] bg-[#fffdf9] p-4 row-start-17 row-end-23 col-start-1 col-end-8 z-1 sm:max-lg:row-start-30 sm:max-lg:row-end-35 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-38 max-sm:row-end-43 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-60 w-full rounded-[16px] object-cover",
          "card-header": "mt-4 space-y-2",
          "card-title": "text-2xl font-medium tracking-[-0.02em] text-[#181512]",
          "card-description": "text-xs font-semibold uppercase tracking-[0.18em] text-[#9a846d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-2 text-sm leading-6 text-[#5f564d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-5",
          "card-action": "rounded-full bg-[#cc785c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a9583e] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="new-jacket" />
        <Card imgSrc="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221200%22%20height%3D%22800%22%20viewBox%3D%220%200%201200%20800%22%3E%3Crect%20width%3D%221200%22%20height%3D%22800%22%20fill%3D%22%23eeeae4%22%2F%3E%3Cpath%20d%3D%22M390%20520l145-165%20105%20120%2070-80%20100%20125H390z%22%20fill%3D%22%23c9c1b7%22%2F%3E%3Ccircle%20cx%3D%22470%22%20cy%3D%22285%22%20r%3D%2242%22%20fill%3D%22%23c9c1b7%22%2F%3E%3C%2Fsvg%3E" imgAlt="羊毛百褶半裙产品图" title="羊毛百褶半裙" description="本周新到" content="中长版型 · 暖灰色 · ¥459" buttonLabel="立即选购" classNames={{
          card: "rounded-[20px] border border-[#eadfce] bg-[#fffdf9] p-4 row-start-17 row-end-23 col-start-8 col-end-15 z-1 sm:max-lg:row-start-35 sm:max-lg:row-end-40 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-43 max-sm:row-end-48 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-60 w-full rounded-[16px] object-cover",
          "card-header": "mt-4 space-y-2",
          "card-title": "text-2xl font-medium tracking-[-0.02em] text-[#181512]",
          "card-description": "text-xs font-semibold uppercase tracking-[0.18em] text-[#9a846d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-2 text-sm leading-6 text-[#5f564d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-5",
          "card-action": "rounded-full bg-[#cc785c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a9583e] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="new-skirt" />
        <Card imgSrc="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80" imgAlt="尖头短靴产品图" title="尖头短靴" description="秋冬鞋履" content="低跟稳步 · 复古咖色 · ¥629" buttonLabel="查看尺码" classNames={{
          card: "rounded-[20px] border border-[#eadfce] bg-[#fffdf9] p-4 row-start-17 row-end-23 col-start-15 col-end-23 z-1 sm:max-lg:row-start-40 sm:max-lg:row-end-45 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-48 max-sm:row-end-53 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-60 w-full rounded-[16px] object-cover",
          "card-header": "mt-4 space-y-2",
          "card-title": "text-2xl font-medium tracking-[-0.02em] text-[#181512]",
          "card-description": "text-xs font-semibold uppercase tracking-[0.18em] text-[#9a846d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-2 text-sm leading-6 text-[#5f564d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-5",
          "card-action": "rounded-full bg-[#cc785c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#a9583e] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="new-boots" />
      </Section>

      <Section id="content-section" columns={22} rows={8} height={760} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 12,
          height: 1316
        },
        mobile: {
          columns: 4,
          rows: 16,
          height: 1412
        }
      }} className="bg-[#f3ede4] px-6 py-10 sm:max-lg:px-4 max-sm:px-3">
        <Text content="穿搭场景与搭配指南" className="text-5xl font-medium tracking-[-0.04em] text-[#181512] max-sm:text-3xl row-start-1 row-end-2 col-start-1 col-end-10 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-9 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="content-title" />
        <Card imgSrc="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1100&q=80" imgAlt="模特在城市街景中的秋季穿搭场景" title="城市通勤场景" description="清晨出门、午间会面、下班聚餐，一套造型完成多场景切换。" content="建议以中性色外套为主轴，再加入柔和内搭和有结构感包袋，稳定又高级。" buttonLabel="阅读指南" classNames={{
          card: "rounded-[24px] bg-[#181715] p-5 text-[#faf7f2] row-start-3 row-end-9 col-start-1 col-end-12 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-8 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-3 max-sm:row-end-9 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-72 w-full rounded-[18px] object-cover max-sm:h-56",
          "card-header": "mt-5 space-y-2",
          "card-title": "text-3xl font-medium tracking-[-0.03em]",
          "card-description": "text-base leading-7 text-[#d0c6bb] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-3 text-sm leading-6 text-[#a9a096] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-5",
          "card-action": "rounded-full bg-[#faf7f2] px-4 py-2.5 text-sm font-semibold text-[#181715] transition hover:bg-white [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="content-scene" />
        <Card imgSrc="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=80" imgAlt="模特展示叠穿技巧与面料层次" title="叠穿搭配指南" description="用一件针织、一件衬衫与一件外套，建立层次感与季节感。" content="选择同色系不同材质，可以让整体更整洁；配饰只保留一个重点即可。" buttonLabel="查看灵感" classNames={{
          card: "rounded-[24px] border border-[#e2d7c8] bg-[#fffdf9] p-5 text-[#181512] row-start-3 row-end-9 col-start-12 col-end-23 z-1 sm:max-lg:row-start-8 sm:max-lg:row-end-13 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-9 max-sm:row-end-15 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-72 w-full rounded-[18px] object-cover max-sm:h-56",
          "card-header": "mt-5 space-y-2",
          "card-title": "text-3xl font-medium tracking-[-0.03em] text-[#181512]",
          "card-description": "text-base leading-7 text-[#5f564d] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-content": "mt-3 text-sm leading-6 text-[#8a7765] [font-family:Inter,ui-sans-serif,sans-serif]",
          "card-footer": "mt-5",
          "card-action": "rounded-full border border-[#dfd3c3] bg-transparent px-4 py-2.5 text-sm font-semibold text-[#181512] transition hover:bg-[#f1e8dc] [font-family:Inter,ui-sans-serif,sans-serif]"
        }} id="content-guide" />
      </Section>

      <Section id="footer-section" columns={22} rows={7} height={520} columnGap={12} rowGap={10} responsive={{
        tablet: {
          columns: 12,
          rows: 10,
          height: 780
        },
        mobile: {
          columns: 4,
          rows: 14,
          height: 820
        }
      }} className="bg-[#181715] px-6 py-10 sm:max-lg:px-4 max-sm:px-3">
        <Text content="AURELIA" className="text-3xl font-semibold tracking-[0.28em] text-[#faf7f2] [font-family:Inter,ui-sans-serif,sans-serif] row-start-1 row-end-2 col-start-1 col-end-6 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="footer-brand" />
        <Text content="以利落版型、柔和色系与高质感面料，构建现代都市衣橱。" className="text-sm leading-7 text-[#b6ada3] [font-family:Inter,ui-sans-serif,sans-serif] row-start-2 row-end-3 col-start-1 col-end-8 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-2 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5" id="footer-brand-copy" />
        <Divider orientation="horizontal" className="border-[#2d2a27] row-start-3 row-end-4 col-start-1 col-end-23 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-4 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-3 max-sm:row-end-4 max-sm:col-start-1 max-sm:col-end-5" id="footer-divider" />
        <Text content={"品牌信息\n关于我们\n线下门店\n品牌故事"} className="whitespace-pre-line text-sm leading-8 text-[#d6cec4] [font-family:Inter,ui-sans-serif,sans-serif] row-start-4 row-end-7 col-start-1 col-end-5 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-7 sm:max-lg:col-start-1 sm:max-lg:col-end-4 max-sm:row-start-4 max-sm:row-end-7 max-sm:col-start-1 max-sm:col-end-3" id="footer-info" />
        <Text content={"客服帮助\n在线客服 09:00–22:00\n订单查询\n会员权益"} className="whitespace-pre-line text-sm leading-8 text-[#d6cec4] [font-family:Inter,ui-sans-serif,sans-serif] row-start-4 row-end-7 col-start-6 col-end-10 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-7 sm:max-lg:col-start-5 sm:max-lg:col-end-8 max-sm:row-start-4 max-sm:row-end-7 max-sm:col-start-3 max-sm:col-end-5" id="footer-service" />
        <Text content={"售后服务\n七天无忧退换\n配送说明\n发票与保养"} className="whitespace-pre-line text-sm leading-8 text-[#d6cec4] [font-family:Inter,ui-sans-serif,sans-serif] row-start-4 row-end-7 col-start-11 col-end-15 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-7 sm:max-lg:col-start-9 sm:max-lg:col-end-13 max-sm:row-start-8 max-sm:row-end-11 max-sm:col-start-1 max-sm:col-end-3" id="footer-support" />
        <Text content={"快捷导航\n新品上架\n热卖榜单\n搭配指南"} className="whitespace-pre-line text-sm leading-8 text-[#d6cec4] [font-family:Inter,ui-sans-serif,sans-serif] row-start-4 row-end-7 col-start-16 col-end-19 z-1 sm:max-lg:row-start-8 sm:max-lg:row-end-10 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-8 max-sm:row-end-11 max-sm:col-start-3 max-sm:col-end-5" id="footer-nav" />
        <Text content="© 2026 AURELIA. All rights reserved." className="self-end text-xs tracking-[0.08em] text-[#8f877e] [font-family:Inter,ui-sans-serif,sans-serif] row-start-7 row-end-8 col-start-1 col-end-8 z-1 sm:max-lg:row-start-10 sm:max-lg:row-end-11 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-13 max-sm:row-end-14 max-sm:col-start-1 max-sm:col-end-5" id="footer-copyright" />
        <Image src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=500&q=80" alt="品牌形象模特侧脸特写" className="h-full w-full rounded-[18px] object-cover opacity-90 row-start-4 row-end-7 col-start-19 col-end-23 z-1 sm:max-lg:row-start-8 sm:max-lg:row-end-10 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-11 max-sm:row-end-13 max-sm:col-start-1 max-sm:col-end-5" id="footer-image" />
      </Section>
    </Root>
  );
}
