import { Button, Card, Carousel, Navbar, Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-[#faf7f1] text-[#181512]">
      <Section id="section-nav" columns={24} rows={4} height={104} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 4,
          height: 104
        },
        mobile: {
          columns: 4,
          rows: 4,
          height: 104
        }
      }} className="border-b border-[#e8dfd2] bg-[#faf7f1]">
        <Navbar brand="ATELIER MODE" sticky items={[
          {
            label: "女装",
            href: "#women",
            active: true
          },
          {
            label: "男装",
            href: "#men"
          },
          {
            label: "鞋包",
            href: "#accessories"
          },
          {
            label: "配饰",
            href: "#style"
          },
          {
            label: "新品",
            href: "#new"
          }
        ]} secondaryAction={{
          label: "搜索",
          href: "#search"
        }} primaryAction={{
          label: "购物车",
          href: "#cart"
        }} classNames={{
          navbar: "bg-transparent row-start-1 row-end-5 col-start-2 col-end-24 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-5 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5",
          "navbar-inner": "h-full px-0 py-0",
          "navbar-brand": "font-['Georgia'] text-[20px] font-medium tracking-[0.18em] text-[#181512]",
          "navbar-nav-list": "justify-center gap-2",
          "navbar-nav-item": "rounded-full px-4 py-2 text-[14px] font-medium text-[#675f55] transition-all duration-200 hover:bg-[#f1e7da] hover:text-[#181512]",
          "navbar-active-nav-item": "bg-[#efe5d7] text-[#181512]",
          "navbar-actions": "gap-3",
          "navbar-secondary-action": "rounded-full border border-[#ded2c2] bg-[#fffdf9] px-4 py-2 text-[14px] font-medium text-[#3d342c] transition-all duration-200 hover:border-[#c97a5d] hover:text-[#181512]",
          "navbar-primary-action": "rounded-full bg-[#c97a5d] px-5 py-2 text-[14px] font-medium text-white transition-all duration-200 hover:bg-[#ab5e43]",
          "navbar-mobile-toggle": "ml-auto rounded-full border border-[#ded2c2] bg-[#fffdf9] text-[#3d342c]",
          "navbar-mobile-panel": "border-[#e8dfd2] bg-[#faf7f1] px-4 py-4 shadow-none"
        }} id="nav-main" />
      </Section>

      <Section id="section-hero" columns={24} rows={16} height={920} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 14,
          height: 840
        },
        mobile: {
          columns: 4,
          rows: 16,
          height: 920,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf7f1] px-5 sm:px-8 lg:px-10 pt-6">
        <Carousel items={[
          {
            imgSrc: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "模特展示秋冬层次穿搭",
            title: "新季衣橱 以质感重写日常",
            description: "精选通勤与周末场景穿搭，满额立减与限时礼遇同步开启"
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "女性模特展示极简时装系列",
            title: "轻奢轮廓 焕新城市衣着",
            description: "外套、针织与鞋履一站搭配，会员专享首发折扣"
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "男女模特展示成套时尚搭配",
            title: "成套精选 省心搭配即刻入手",
            description: "爆款榜单与新品上架同屏呈现，帮助快速完成整套选购"
          }
        ]} classNames={{
          carousel: "overflow-hidden rounded-[28px] border border-[#e7ddcf] bg-[#f5ede2] shadow-[0_20px_70px_rgba(32,24,18,0.08)] row-start-1 row-end-17 col-start-1 col-end-25 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-15 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-17 max-sm:col-start-1 max-sm:col-end-5",
          "carousel-content": "h-full",
          "carousel-item": "relative h-full basis-full",
          "carousel-item-img": "h-full w-full object-cover",
          "carousel-item-title": "absolute left-8 top-[18%] max-w-[540px] font-['Georgia'] text-[56px] leading-[1.02] tracking-[-0.04em] text-white drop-shadow-[0_8px_28px_rgba(0,0,0,0.28)] sm:max-lg:left-7 sm:max-lg:max-w-[420px] sm:max-lg:text-[42px] max-sm:left-5 max-sm:right-5 max-sm:top-[14%] max-sm:max-w-none max-sm:text-[30px]",
          "carousel-item-description": "absolute left-8 top-[48%] max-w-[430px] text-[17px] leading-7 text-white/92 drop-shadow-[0_6px_24px_rgba(0,0,0,0.24)] sm:max-lg:left-7 sm:max-lg:top-[50%] sm:max-lg:max-w-[360px] max-sm:left-5 max-sm:right-5 max-sm:top-[42%] max-sm:max-w-none max-sm:text-[15px] max-sm:leading-6",
          "carousel-previous": "left-6 top-auto bottom-6 h-11 w-11 -translate-y-0 rounded-full border border-white/40 bg-white/18 text-white backdrop-blur-md transition-all duration-200 hover:bg-white/28 max-sm:left-4 max-sm:bottom-4",
          "carousel-next": "right-6 top-auto bottom-6 h-11 w-11 -translate-y-0 rounded-full border border-white/40 bg-white/18 text-white backdrop-blur-md transition-all duration-200 hover:bg-white/28 max-sm:right-4 max-sm:bottom-4"
        }} id="hero-carousel" />
      </Section>

      <Section id="section-promos" columns={24} rows={7} height={467} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 8,
          height: 540
        },
        mobile: {
          columns: 4,
          rows: 12,
          height: 760,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf7f1] px-5 pb-6 sm:px-8 lg:px-10">
        <Card title="会员周福利" description="全场精选每满 900 减 120" content="叠加新人礼与指定单品免邮，覆盖外套、针织与鞋包系列。" buttonLabel="立即领取" classNames={{
          card: "justify-between rounded-[22px] bg-[#c97a5d] p-8 text-white shadow-[0_20px_50px_rgba(201,122,93,0.18)] row-start-1 row-end-7 col-start-1 col-end-13 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-5 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5",
          "card-header": "space-y-3",
          "card-title": "font-['Georgia'] text-[34px] leading-tight tracking-[-0.03em]",
          "card-description": "text-[18px] font-medium text-white/90",
          "card-content": "max-w-[420px] text-[15px] leading-7 text-white/88",
          "card-footer": "pt-6",
          "card-action": "rounded-full bg-[#fffaf5] px-5 py-3 text-[14px] font-medium text-[#8a4e39] transition-all duration-200 hover:bg-white hover:text-[#6b3d2c]"
        }} id="promo-wide" />
        <Card title="限时折扣" description="热卖专区低至 6 折" content="爆款外套与基础单品一键直达。" buttonLabel="进入会场" classNames={{
          card: "rounded-[22px] border border-[#e7ddcf] bg-[#f1e7da] p-6 row-start-1 row-end-4 col-start-13 col-end-19 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-9 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-5 max-sm:row-end-9 max-sm:col-start-1 max-sm:col-end-5",
          "card-header": "space-y-2",
          "card-title": "font-['Georgia'] text-[26px] tracking-[-0.03em] text-[#181512]",
          "card-description": "text-[15px] font-medium text-[#6b6258]",
          "card-content": "text-[14px] leading-6 text-[#4c433a]",
          "card-footer": "pt-5",
          "card-action": "rounded-full border border-[#d9ccb9] px-4 py-2 text-[13px] font-medium text-[#2d2722] transition-all duration-200 hover:border-[#c97a5d] hover:text-[#8a4e39]"
        }} id="promo-entry-one" />
        <Card title="穿搭礼包" description="成套购享配饰加价礼" content="围巾、包袋与鞋履可叠加专属优惠。" buttonLabel="查看组合" classNames={{
          card: "rounded-[22px] border border-[#e7ddcf] bg-[#fffdf9] p-6 row-start-1 row-end-4 col-start-19 col-end-25 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-9 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-9 max-sm:row-end-13 max-sm:col-start-1 max-sm:col-end-5",
          "card-header": "space-y-2",
          "card-title": "font-['Georgia'] text-[26px] tracking-[-0.03em] text-[#181512]",
          "card-description": "text-[15px] font-medium text-[#6b6258]",
          "card-content": "text-[14px] leading-6 text-[#4c433a]",
          "card-footer": "pt-5",
          "card-action": "rounded-full border border-[#d9ccb9] px-4 py-2 text-[13px] font-medium text-[#2d2722] transition-all duration-200 hover:border-[#c97a5d] hover:text-[#8a4e39]"
        }} id="promo-entry-two" />
        <Card title="门店自提" description="线上下单 当日门店取货" content="热门尺码优先锁定，减少断码等待。" buttonLabel="附近门店" classNames={{
          card: "sm:max-lg:hidden max-sm:hidden rounded-[22px] border border-[#e7ddcf] bg-[#181715] p-7 text-[#faf7f1] row-start-4 row-end-8 col-start-13 col-end-25 z-1",
          "card-header": "space-y-2",
          "card-title": "font-['Georgia'] text-[28px] tracking-[-0.03em]",
          "card-description": "text-[15px] font-medium text-[#d7cbbc]",
          "card-content": "max-w-[460px] text-[14px] leading-6 text-[#ece2d4]",
          "card-footer": "pt-5",
          "card-action": "rounded-full bg-[#2a2724] px-4 py-2 text-[13px] font-medium text-[#faf7f1] transition-all duration-200 hover:bg-[#35312d]"
        }} id="promo-entry-three" />
      </Section>

      <Section id="section-products" columns={24} rows={18} height={1360} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 28,
          height: 2060
        },
        mobile: {
          columns: 4,
          rows: 36,
          height: 3040,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#f7f0e6] px-5 py-10 sm:px-8 lg:px-10">
        <Text content="分类穿搭 · 爆款推荐 · 新品上架" className="font-['Georgia'] text-[42px] leading-tight tracking-[-0.04em] text-[#181512] max-sm:text-[28px] row-start-1 row-end-2 col-start-1 col-end-17 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="products-title" />
        <Text content="以整洁的网格陈列呈现核心单品，让用户快速完成从灵感到下单的决策。" className="max-w-[620px] text-[16px] leading-7 text-[#534a40] row-start-2 row-end-3 col-start-1 col-end-13 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-2 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5" id="products-subtitle" />
        <Button label="查看全部分类" type="button" className="justify-center self-center rounded-full border border-[#dbcdbb] bg-[#fffdf9] px-5 py-3 text-[14px] font-medium text-[#2f2924] transition-all duration-200 hover:border-[#c97a5d] hover:text-[#8a4e39] row-start-1 row-end-3 col-start-20 col-end-25 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-4 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-3 max-sm:row-end-4 max-sm:col-start-1 max-sm:col-end-5" id="products-filter" />
        <Card imgSrc="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80" imgAlt="米白色长款风衣穿搭" title="都市长风衣" description="通勤主理 · 轻挺面料" content="经典廓形与细节收腰兼顾，适合换季叠穿。" buttonLabel="加入心愿单" classNames={{
          card: "rounded-[22px] border border-[#e7ddcf] bg-[#fffdf9] overflow-hidden row-start-4 row-end-11 col-start-1 col-end-7 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-11 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-4 max-sm:row-end-11 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[220px] w-full object-cover max-sm:h-[220px]",
          "card-header": "space-y-2 px-6 pt-6",
          "card-title": "font-['Georgia'] text-[26px] tracking-[-0.03em] text-[#181512]",
          "card-description": "text-[13px] font-medium uppercase tracking-[0.18em] text-[#9a6c58]",
          "card-content": "px-6 pt-4 text-[14px] leading-6 text-[#4d443b]",
          "card-footer": "px-6 pb-6 pt-6",
          "card-action": "rounded-full bg-[#181715] px-4 py-2 text-[13px] font-medium text-[#faf7f1] transition-all duration-200 hover:bg-[#2c2824]"
        }} id="product-card-01" />
        <Card imgSrc="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80" imgAlt="基础款白色短袖上衣" title="高支基础T恤" description="爆款推荐 · 四季常备" content="柔软亲肤的日常核心单品，适配多种下装组合。" buttonLabel="立即选购" classNames={{
          card: "rounded-[22px] border border-[#e7ddcf] bg-[#fffdf9] overflow-hidden row-start-4 row-end-11 col-start-7 col-end-13 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-11 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-12 max-sm:row-end-19 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[220px] w-full object-cover max-sm:h-[220px]",
          "card-header": "space-y-2 px-6 pt-6",
          "card-title": "font-['Georgia'] text-[26px] tracking-[-0.03em] text-[#181512]",
          "card-description": "text-[13px] font-medium uppercase tracking-[0.18em] text-[#9a6c58]",
          "card-content": "px-6 pt-4 text-[14px] leading-6 text-[#4d443b]",
          "card-footer": "px-6 pb-6 pt-6",
          "card-action": "rounded-full bg-[#181715] px-4 py-2 text-[13px] font-medium text-[#faf7f1] transition-all duration-200 hover:bg-[#2c2824]"
        }} id="product-card-02" />
        <Card imgSrc="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80" imgAlt="红白运动鞋产品展示" title="轻量复古球鞋" description="新品上架 · 热门配色" content="缓震鞋底与复古轮廓平衡，适合日常出行与周末漫步。" buttonLabel="查看详情" classNames={{
          card: "rounded-[22px] border border-[#e7ddcf] bg-[#fffdf9] overflow-hidden row-start-4 row-end-11 col-start-13 col-end-19 z-1 sm:max-lg:row-start-12 sm:max-lg:row-end-19 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-20 max-sm:row-end-27 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[220px] w-full object-cover max-sm:h-[220px]",
          "card-header": "space-y-2 px-6 pt-6",
          "card-title": "font-['Georgia'] text-[26px] tracking-[-0.03em] text-[#181512]",
          "card-description": "text-[13px] font-medium uppercase tracking-[0.18em] text-[#9a6c58]",
          "card-content": "px-6 pt-4 text-[14px] leading-6 text-[#4d443b]",
          "card-footer": "px-6 pb-6 pt-6",
          "card-action": "rounded-full bg-[#181715] px-4 py-2 text-[13px] font-medium text-[#faf7f1] transition-all duration-200 hover:bg-[#2c2824]"
        }} id="product-card-03" />
        <Card imgSrc="https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=80" imgAlt="棕色皮革手袋产品展示" title="柔雾皮革托特" description="搭配点睛 · 容量充足" content="温润皮质与挺括包型，提升整体造型完成度。" buttonLabel="加入购物车" classNames={{
          card: "rounded-[22px] border border-[#e7ddcf] bg-[#fffdf9] overflow-hidden max-sm:hidden row-start-4 row-end-11 col-start-19 col-end-25 z-1 sm:max-lg:row-start-12 sm:max-lg:row-end-19 sm:max-lg:col-start-7 sm:max-lg:col-end-13",
          "card-img": "h-[220px] w-full object-cover max-sm:h-[220px]",
          "card-header": "space-y-2 px-6 pt-6",
          "card-title": "font-['Georgia'] text-[26px] tracking-[-0.03em] text-[#181512]",
          "card-description": "text-[13px] font-medium uppercase tracking-[0.18em] text-[#9a6c58]",
          "card-content": "px-6 pt-4 text-[14px] leading-6 text-[#4d443b]",
          "card-footer": "px-6 pb-6 pt-6",
          "card-action": "rounded-full bg-[#181715] px-4 py-2 text-[13px] font-medium text-[#faf7f1] transition-all duration-200 hover:bg-[#2c2824]"
        }} id="product-card-04" />
        <Card imgSrc="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80" imgAlt="女性模特展示奶油色针织套装" title="奶油针织套装" description="新品系列" content="柔和色调延续整洁衣橱语言，适合日常与约会场景。" buttonLabel="立即入手" classNames={{
          card: "max-sm:hidden rounded-[22px] border border-[#e7ddcf] bg-[#fff7ed] overflow-hidden row-start-11 row-end-19 col-start-1 col-end-9 z-1 sm:max-lg:row-start-20 sm:max-lg:row-end-29 sm:max-lg:col-start-1 sm:max-lg:col-end-5",
          "card-img": "h-[250px] w-full object-cover",
          "card-header": "space-y-2 px-7 pt-7",
          "card-title": "font-['Georgia'] text-[28px] tracking-[-0.03em]",
          "card-description": "text-[13px] font-medium uppercase tracking-[0.18em] text-[#9a6c58]",
          "card-content": "px-7 pt-4 text-[14px] leading-6 text-[#4d443b]",
          "card-footer": "px-7 pb-7 pt-6",
          "card-action": "rounded-full border border-[#d8c9b5] px-4 py-2 text-[13px] font-medium text-[#2b2621] transition-all duration-200 hover:border-[#c97a5d] hover:text-[#8a4e39]"
        }} id="new-card-01" />
        <Card imgSrc="https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80" imgAlt="男士模特展示深色羊毛外套" title="羊毛短大衣" description="新品系列" content="修长线条搭配利落肩型，构建冬季核心层次。" buttonLabel="查看详情" classNames={{
          card: "max-sm:hidden rounded-[22px] bg-[#181715] text-[#faf7f1] overflow-hidden row-start-11 row-end-19 col-start-9 col-end-17 z-1 sm:max-lg:row-start-20 sm:max-lg:row-end-29 sm:max-lg:col-start-5 sm:max-lg:col-end-9",
          "card-img": "h-[250px] w-full object-cover",
          "card-header": "space-y-2 px-7 pt-7 text-[#faf7f1]",
          "card-title": "font-['Georgia'] text-[28px] tracking-[-0.03em]",
          "card-description": "text-[13px] font-medium uppercase tracking-[0.18em] text-[#e4c9b7]",
          "card-content": "px-7 pt-4 text-[14px] leading-6 text-[#efe2d4]",
          "card-footer": "px-7 pb-7 pt-6",
          "card-action": "rounded-full bg-[#faf7f1] px-4 py-2 text-[13px] font-medium text-[#181715] transition-all duration-200 hover:bg-white"
        }} id="new-card-02" />
        <Card imgSrc="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80" imgAlt="女性模特展示黑色连衣裙" title="极简垂感连衣裙" description="新品系列" content="线条简练，适合单穿或叠搭，满足多场景造型需求。" buttonLabel="加入购物车" classNames={{
          card: "max-sm:hidden rounded-[22px] border border-[#e7ddcf] bg-[#fff7ed] overflow-hidden row-start-11 row-end-19 col-start-17 col-end-25 z-1 sm:max-lg:row-start-20 sm:max-lg:row-end-29 sm:max-lg:col-start-9 sm:max-lg:col-end-13",
          "card-img": "h-[250px] w-full object-cover",
          "card-header": "space-y-2 px-7 pt-7",
          "card-title": "font-['Georgia'] text-[28px] tracking-[-0.03em]",
          "card-description": "text-[13px] font-medium uppercase tracking-[0.18em] text-[#9a6c58]",
          "card-content": "px-7 pt-4 text-[14px] leading-6 text-[#4d443b]",
          "card-footer": "px-7 pb-7 pt-6",
          "card-action": "rounded-full border border-[#d8c9b5] px-4 py-2 text-[13px] font-medium text-[#2b2621] transition-all duration-200 hover:border-[#c97a5d] hover:text-[#8a4e39]"
        }} id="new-card-03" />
        <Card imgSrc="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80" imgAlt="移动端展示精选新品穿搭" title="新品精选合集" description="移动端精选" content="聚合奶油针织、羊毛外套与极简连衣裙，便于在小屏中快速浏览。" buttonLabel="进入新品" classNames={{
          card: "hidden max-sm:flex rounded-[22px] border border-[#e7ddcf] bg-[#fff7ed] overflow-hidden row-start-28 row-end-36 col-start-1 col-end-5 z-1",
          "card-img": "h-[220px] w-full object-cover",
          "card-header": "space-y-2 px-6 pt-6",
          "card-title": "font-['Georgia'] text-[26px] tracking-[-0.03em] text-[#181512]",
          "card-description": "text-[13px] font-medium uppercase tracking-[0.18em] text-[#9a6c58]",
          "card-content": "px-6 pt-4 text-[14px] leading-6 text-[#4d443b]",
          "card-footer": "px-6 pb-6 pt-6",
          "card-action": "rounded-full border border-[#d8c9b5] px-4 py-2 text-[13px] font-medium text-[#2b2621] transition-all duration-200 hover:border-[#c97a5d] hover:text-[#8a4e39]"
        }} id="new-card-mobile" />
      </Section>

      <Section id="section-content" columns={24} rows={9} height={620} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 12,
          height: 1100
        },
        mobile: {
          columns: 4,
          rows: 14,
          height: 1120,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf7f1] px-5 py-10 sm:px-8 lg:px-10">
        <Card imgSrc="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80" imgAlt="模特在城市街景中的秋季穿搭场景" title="穿搭场景" description="从通勤到周末，让单品进入真实生活" content="通过场景化造型推荐，帮助用户理解同一件单品在不同时间与空间中的穿着方式。" buttonLabel="浏览场景" classNames={{
          card: "overflow-hidden rounded-[24px] border border-[#e7ddcf] bg-[#fffdf9] row-start-1 row-end-10 col-start-1 col-end-13 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-7 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[260px] w-full object-cover max-sm:h-[220px]",
          "card-header": "space-y-2 px-7 pt-7",
          "card-title": "font-['Georgia'] text-[30px] tracking-[-0.03em] text-[#181512]",
          "card-description": "text-[15px] font-medium text-[#6a6158]",
          "card-content": "px-7 pt-4 text-[14px] leading-7 text-[#4e463e]",
          "card-footer": "px-7 pb-7 pt-6",
          "card-action": "rounded-full border border-[#dacdba] px-4 py-2 text-[13px] font-medium text-[#2d2722] transition-all duration-200 hover:border-[#c97a5d] hover:text-[#8a4e39]"
        }} id="scene-card" />
        <Card imgSrc="https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=1200&q=80" imgAlt="服饰细节与搭配手册展示" title="搭配指南" description="色彩、版型与层次建议" content="为用户提供简洁的搭配原则与成套购买建议，提升浏览效率与客单价表现。" buttonLabel="查看指南" classNames={{
          card: "overflow-hidden rounded-[24px] bg-[#181715] text-[#faf7f1] row-start-1 row-end-10 col-start-13 col-end-25 z-1 sm:max-lg:row-start-7 sm:max-lg:row-end-13 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-8 max-sm:row-end-15 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[260px] w-full object-cover max-sm:h-[220px]",
          "card-header": "space-y-2 px-7 pt-7",
          "card-title": "font-['Georgia'] text-[30px] tracking-[-0.03em]",
          "card-description": "text-[15px] font-medium text-[#d9ccbe]",
          "card-content": "px-7 pt-4 text-[14px] leading-7 text-[#eee1d3]",
          "card-footer": "px-7 pb-7 pt-6",
          "card-action": "rounded-full bg-[#2c2824] px-4 py-2 text-[13px] font-medium text-[#faf7f1] transition-all duration-200 hover:bg-[#38332e]"
        }} id="guide-card" />
      </Section>

      <Section id="section-footer" columns={24} rows={7} height={420} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 10,
          height: 580
        },
        mobile: {
          columns: 4,
          rows: 14,
          height: 760,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#181715] px-5 py-10 sm:px-8 lg:px-10">
        <Text content="ATELIER MODE" className="font-['Georgia'] text-[28px] tracking-[0.18em] text-[#faf7f1] row-start-1 row-end-2 col-start-1 col-end-7 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="footer-brand" />
        <Text content="以高质感基础衣橱为核心，提供女装、男装、鞋包与搭配内容，支持门店自提与七天无忧售后。" className="max-w-[420px] text-[14px] leading-7 text-[#d8cbbd] row-start-2 row-end-4 col-start-1 col-end-9 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-4 sm:max-lg:col-start-1 sm:max-lg:col-end-8 max-sm:row-start-2 max-sm:row-end-4 max-sm:col-start-1 max-sm:col-end-5" id="footer-info" />
        <Text content={"客服服务\n在线咨询 09:00 - 22:00\n售后支持 7 天无忧退换"} className="whitespace-pre-wrap text-[14px] leading-7 text-[#f3e8db] row-start-1 row-end-4 col-start-11 col-end-15 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-8 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-5 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5" id="footer-service" />
        <Text content={"导航链接\n新品上架\n爆款推荐\n门店信息\n品牌故事"} className="whitespace-pre-wrap text-[14px] leading-7 text-[#d8cbbd] row-start-1 row-end-4 col-start-16 col-end-20 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-8 sm:max-lg:col-start-5 sm:max-lg:col-end-9 max-sm:row-start-8 max-sm:row-end-12 max-sm:col-start-1 max-sm:col-end-3" id="footer-links" />
        <Text content={"售后说明\n物流配送\n尺码帮助\n支付方式\n隐私政策"} className="whitespace-pre-wrap text-[14px] leading-7 text-[#d8cbbd] row-start-1 row-end-4 col-start-21 col-end-25 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-8 sm:max-lg:col-start-9 sm:max-lg:col-end-13 max-sm:row-start-8 max-sm:row-end-12 max-sm:col-start-3 max-sm:col-end-5" id="footer-after" />
        <Text content="© 2026 ATELIER MODE. 保留所有权利。" className="text-[13px] text-[#9f9488] row-start-6 row-end-7 col-start-1 col-end-9 z-1 sm:max-lg:row-start-10 sm:max-lg:row-end-11 sm:max-lg:col-start-1 sm:max-lg:col-end-8 max-sm:row-start-13 max-sm:row-end-14 max-sm:col-start-1 max-sm:col-end-5" id="footer-copy" />
      </Section>
    </Root>
  );
}
