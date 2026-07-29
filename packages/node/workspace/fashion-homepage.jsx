import { Button, Card, Carousel, Navbar, Root, Section, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-[#faf9f5] text-[#141413]">
      <Section id="nav-section" columns={22} rows={4} height={92} columnGap={11} rowGap={8} responsive={{
        tablet: {
          columns: 12,
          rows: 4,
          height: 92
        },
        mobile: {
          columns: 4,
          rows: 5,
          height: 132,
          columnGap: 10,
          rowGap: 8
        }
      }} className="border-b border-[#e6dfd8] bg-[#faf9f5]">
        <Navbar brand="ATELIER MODE" sticky showMobileMenu items={[
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
            href: "#bags"
          },
          {
            label: "配饰",
            href: "#accessories"
          },
          {
            label: "折扣区",
            href: "#benefits"
          }
        ]} primaryAction={{
          label: "购物车 2",
          href: "#cart"
        }} secondaryAction={{
          label: "搜索",
          href: "#search"
        }} classNames={{
          navbar: "sticky top-0 rounded-none border-none bg-[#faf9f5]/95 backdrop-blur row-start-1 row-end-5 col-start-1 col-end-23 z-50 sm:max-lg:row-start-1 sm:max-lg:row-end-5 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5",
          "navbar-inner": "h-full px-8 sm:max-lg:px-5 max-sm:px-4",
          "navbar-brand": "gap-0 font-[Georgia] text-[20px] font-medium tracking-[0.18em] text-[#141413]",
          "navbar-nav-list": "justify-center gap-2",
          "navbar-nav-item": "rounded-full px-4 py-2 text-[14px] font-medium text-[#6c6a64] transition hover:bg-[#efe9de] hover:text-[#141413]",
          "navbar-active-nav-item": "rounded-full bg-[#efe9de] px-4 py-2 text-[#141413]",
          "navbar-actions": "gap-3",
          "navbar-secondary-action": "rounded-full border border-[#e6dfd8] bg-[#faf9f5] px-4 py-2 text-[14px] font-medium text-[#141413] transition hover:-translate-y-0.5 hover:border-[#cc785c] hover:text-[#cc785c]",
          "navbar-primary-action": "rounded-full bg-[#cc785c] px-5 py-2 text-[14px] font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#a9583e]",
          "navbar-mobile-toggle": "border border-[#e6dfd8] text-[#141413]",
          "navbar-mobile-panel": "border-t border-[#e6dfd8] bg-[#faf9f5] px-4 py-4 shadow-none"
        }} id="top-navbar" />
        <Button label="搜索" type="button" className="hidden h-10 rounded-full border border-[#e6dfd8] bg-[#faf9f5] px-4 text-[13px] font-medium text-[#141413] sm:max-lg:inline-flex max-sm:inline-flex row-start-1 row-end-2 col-start-1 col-end-2 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-3 sm:max-lg:col-start-9 sm:max-lg:col-end-11 max-sm:row-start-4 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-3" id="nav-search-mobile" />
        <Button label="购物车" type="button" className="hidden h-10 rounded-full bg-[#cc785c] px-4 text-[13px] font-medium text-white sm:max-lg:inline-flex max-sm:inline-flex row-start-1 row-end-2 col-start-1 col-end-2 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-3 sm:max-lg:col-start-11 sm:max-lg:col-end-13 max-sm:row-start-4 max-sm:row-end-5 max-sm:col-start-3 max-sm:col-end-5" id="nav-cart-mobile" />
      </Section>

      <Section id="hero-section" columns={22} rows={12} height={980} columnGap={11} rowGap={11} responsive={{
        tablet: {
          columns: 12,
          rows: 14,
          height: 980
        },
        mobile: {
          columns: 4,
          rows: 15,
          height: 920,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf9f5] px-6 pt-6 pb-10 sm:max-lg:px-5 max-sm:px-4">
        <Carousel items={[
          {
            imgSrc: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "女装秋冬穿搭模特展示",
            title: "秋冬新章 · 质感层叠",
            description: "精选羊毛大衣、针织套装与通勤靴履，满额立减，焕新衣橱。"
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "都市时尚穿搭模特展示",
            title: "城市漫游 · 轻松成套",
            description: "从早八通勤到夜间约会，一键入手完整造型。"
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "男女同款休闲服饰展示",
            title: "周末假日 · 松弛有型",
            description: "卫衣、牛仔与轻羽绒组合，兼顾舒适和镜头感。"
          }
        ]} classNames={{
          carousel: "overflow-hidden rounded-[28px] bg-[#181715] row-start-1 row-end-13 col-start-1 col-end-23 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-15 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-16 max-sm:col-start-1 max-sm:col-end-5",
          "carousel-content": "h-full",
          "carousel-item": "relative h-full",
          "carousel-item-img": "h-full w-full object-cover brightness-[0.62]",
          "carousel-item-title": "absolute left-12 top-16 max-w-[520px] font-[Georgia] text-[68px] font-normal leading-[1.02] tracking-[-0.04em] text-[#faf9f5] sm:max-lg:left-8 sm:max-lg:top-12 sm:max-lg:max-w-[420px] sm:max-lg:text-[52px] max-sm:left-6 max-sm:top-10 max-sm:max-w-[250px] max-sm:text-[34px]",
          "carousel-item-description": "absolute left-12 top-[270px] max-w-[420px] rounded-[16px] bg-black/20 px-4 py-3 text-[18px] leading-8 text-[#ebe6df] backdrop-blur-sm sm:max-lg:left-8 sm:max-lg:top-[220px] sm:max-lg:max-w-[360px] max-sm:left-6 max-sm:top-[164px] max-sm:max-w-[250px] max-sm:text-[15px] max-sm:leading-6",
          "carousel-previous": "left-6 top-auto bottom-6 h-12 w-12 -translate-y-0 rounded-full border border-white/30 bg-black/20 text-white backdrop-blur transition hover:bg-white hover:text-[#141413] max-sm:left-4 max-sm:h-10 max-sm:w-10",
          "carousel-next": "right-6 top-auto bottom-6 h-12 w-12 -translate-y-0 rounded-full border border-white/30 bg-black/20 text-white backdrop-blur transition hover:bg-white hover:text-[#141413] max-sm:right-4 max-sm:h-10 max-sm:w-10"
        }} id="hero-carousel" />
      </Section>

      <Section id="benefits-section" columns={22} rows={7} height={579} columnGap={11} rowGap={11} responsive={{
        tablet: {
          columns: 12,
          rows: 11,
          height: 610
        },
        mobile: {
          columns: 4,
          rows: 13,
          height: 1072,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf9f5] px-6 py-2 sm:max-lg:px-5 max-sm:px-4">
        <Card title="双11 会员礼遇" description="全场每满 ¥300 减 ¥40，尖货单品限时 2 件 85 折。" content="新人领券、门店自提、48 小时极速发货同步开启，让高频换季采购更轻松。" buttonLabel="立即抢券" classNames={{
          card: "justify-between rounded-[24px] bg-[#cc785c] p-8 text-white row-start-1 row-end-8 col-start-1 col-end-11 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-7 sm:max-lg:col-start-1 sm:max-lg:col-end-8 max-sm:row-start-1 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5",
          "card-title": "font-[Georgia] text-[34px] leading-tight tracking-[-0.03em]",
          "card-description": "mt-3 text-[17px] leading-7 text-white/90",
          "card-content": "mt-6 max-w-[440px] text-[15px] leading-7 text-white/80",
          "card-footer": "mt-8",
          "card-action": "rounded-full bg-[#faf9f5] px-5 py-3 text-[14px] font-medium text-[#141413] transition hover:-translate-y-0.5 hover:bg-white"
        }} id="benefit-main" />
        <Card title="优惠入口" description="折上专区 / 直播专享 / 品类券" content="按风格、价位与尺码快速筛选，直达适合你的活动会场。" buttonLabel="查看会场" classNames={{
          card: "rounded-[24px] border border-[#e6dfd8] bg-[#efe9de] p-7 row-start-1 row-end-4 col-start-11 col-end-17 z-1 sm:max-lg:row-start-7 sm:max-lg:row-end-12 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-5 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5",
          "card-title": "text-[24px] font-medium text-[#141413]",
          "card-description": "mt-3 text-[15px] leading-6 text-[#3d3d3a]",
          "card-content": "mt-4 text-[14px] leading-6 text-[#6c6a64]",
          "card-footer": "mt-6",
          "card-action": "rounded-full border border-[#d9d2c9] px-4 py-2 text-[14px] text-[#141413] transition hover:border-[#cc785c] hover:text-[#cc785c]"
        }} id="benefit-coupon" />
        <Card title="到店服务" description="免费改裤长 / 一对一搭配 / 会员积分" content="线上下单门店试穿，收藏清单与购物车跨端同步。" buttonLabel="预约试穿" classNames={{
          card: "rounded-[24px] border border-[#e6dfd8] bg-[#faf9f5] p-7 row-start-4 row-end-8 col-start-11 col-end-17 z-1 sm:max-lg:row-start-7 sm:max-lg:row-end-12 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-8 max-sm:row-end-11 max-sm:col-start-1 max-sm:col-end-5",
          "card-title": "text-[24px] font-medium text-[#141413]",
          "card-description": "mt-3 text-[15px] leading-6 text-[#3d3d3a]",
          "card-content": "mt-4 text-[14px] leading-6 text-[#6c6a64]",
          "card-footer": "mt-6",
          "card-action": "rounded-full border border-[#d9d2c9] px-4 py-2 text-[14px] text-[#141413] transition hover:border-[#cc785c] hover:text-[#cc785c]"
        }} id="benefit-service" />
        <Card title="今日爆抢" description="限时 6 小时" content="精选大衣、卫衣、通勤包低至 6 折，库存实时更新。" buttonLabel="进入秒杀" classNames={{
          card: "rounded-[24px] bg-[#181715] p-7 text-[#faf9f5] row-start-1 row-end-8 col-start-17 col-end-23 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-6 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-11 max-sm:row-end-14 max-sm:col-start-1 max-sm:col-end-5",
          "card-title": "font-[Georgia] text-[28px] tracking-[-0.03em] text-[#faf9f5]",
          "card-description": "mt-3 text-[15px] text-[#ebe6df]",
          "card-content": "mt-4 text-[14px] leading-6 text-[#a09d96]",
          "card-footer": "mt-6",
          "card-action": "rounded-full bg-[#cc785c] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#a9583e]"
        }} id="benefit-flash" />
      </Section>

      <Section id="products-section" columns={22} rows={14} height={1180} columnGap={11} rowGap={11} responsive={{
        tablet: {
          columns: 12,
          rows: 18,
          height: 2121
        },
        mobile: {
          columns: 4,
          rows: 31,
          height: 3325,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf9f5] px-6 py-10 sm:max-lg:px-5 max-sm:px-4">
        <Text content="分类穿搭 · 爆款推荐 · 新品上架" className="font-[Georgia] text-[48px] leading-none tracking-[-0.03em] text-[#141413] sm:max-lg:text-[40px] max-sm:text-[24px] max-sm:leading-[1.25] row-start-1 row-end-2 col-start-1 col-end-12 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5" id="products-heading" />
        <Text content="按场景快速选购，保持版式清晰，同时提供足够的商品密度。" className="text-[16px] leading-7 text-[#6c6a64] max-sm:text-[14px] max-sm:leading-6 row-start-2 row-end-3 col-start-1 col-end-11 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-10 max-sm:row-start-3 max-sm:row-end-4 max-sm:col-start-1 max-sm:col-end-5" id="products-subheading" />
        <Card imgSrc="https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80" imgAlt="通勤风女装造型" title="通勤轻奢" description="西装、衬衫、半裙成套购" content="极简剪裁与柔和中性色，适合办公室与正式会面。" buttonLabel="选整套" classNames={{
          card: "overflow-hidden rounded-[22px] border border-[#e6dfd8] bg-[#faf9f5] row-start-4 row-end-11 col-start-1 col-end-6 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-9 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-4 max-sm:row-end-9 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[58%] w-full object-cover",
          "card-header": "px-5 pt-5",
          "card-title": "text-[24px] font-medium text-[#141413]",
          "card-description": "mt-2 text-[14px] text-[#6c6a64]",
          "card-content": "px-5 pt-4 text-[14px] leading-6 text-[#3d3d3a]",
          "card-footer": "px-5 pb-5 pt-5",
          "card-action": "rounded-full border border-[#d9d2c9] px-4 py-2 text-[14px] text-[#141413] transition hover:border-[#cc785c] hover:text-[#cc785c]"
        }} id="look-office" />
        <Card imgSrc="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80" imgAlt="周末休闲穿搭" title="周末松弛" description="卫衣、牛仔、球鞋组合" content="柔软面料与宽松轮廓，适合城市短途和假日漫游。" buttonLabel="逛热销" classNames={{
          card: "overflow-hidden rounded-[22px] border border-[#e6dfd8] bg-[#efe9de] row-start-4 row-end-11 col-start-6 col-end-11 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-9 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-9 max-sm:row-end-14 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[58%] w-full object-cover",
          "card-header": "px-5 pt-5",
          "card-title": "text-[24px] font-medium text-[#141413]",
          "card-description": "mt-2 text-[14px] text-[#6c6a64]",
          "card-content": "px-5 pt-4 text-[14px] leading-6 text-[#3d3d3a]",
          "card-footer": "px-5 pb-5 pt-5",
          "card-action": "rounded-full border border-[#d9d2c9] px-4 py-2 text-[14px] text-[#141413] transition hover:border-[#cc785c] hover:text-[#cc785c]"
        }} id="look-weekend" />
        <Card imgSrc="https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80" imgAlt="晚宴派对连衣裙" title="晚宴焦点" description="礼裙、高跟鞋、闪耀配饰" content="强调线条与光泽材质，适合派对、酒会与节日聚会。" buttonLabel="查看新品" classNames={{
          card: "overflow-hidden rounded-[22px] border border-[#e6dfd8] bg-[#faf9f5] row-start-4 row-end-11 col-start-11 col-end-16 z-1 sm:max-lg:row-start-9 sm:max-lg:row-end-14 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-14 max-sm:row-end-20 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[58%] w-full object-cover",
          "card-header": "px-5 pt-5",
          "card-title": "text-[24px] font-medium text-[#141413]",
          "card-description": "mt-2 text-[14px] text-[#6c6a64]",
          "card-content": "px-5 pt-4 text-[14px] leading-6 text-[#3d3d3a]",
          "card-footer": "px-5 pb-5 pt-5",
          "card-action": "rounded-full border border-[#d9d2c9] px-4 py-2 text-[14px] text-[#141413] transition hover:border-[#cc785c] hover:text-[#cc785c]"
        }} id="look-party" />
        <Card imgSrc="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80" imgAlt="男士都会穿搭" title="男士都会" description="挺括外套与利落叠穿" content="结构感廓形与经典色系，适合商务与城市日常切换。" buttonLabel="浏览男装" classNames={{
          card: "overflow-hidden rounded-[22px] bg-[#181715] text-[#faf9f5] row-start-4 row-end-11 col-start-16 col-end-23 z-1 sm:max-lg:row-start-9 sm:max-lg:row-end-14 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-20 max-sm:row-end-26 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[58%] w-full object-cover",
          "card-header": "px-5 pt-5",
          "card-title": "text-[24px] font-medium text-[#faf9f5]",
          "card-description": "mt-2 text-[14px] text-[#ebe6df]",
          "card-content": "px-5 pt-4 text-[14px] leading-6 text-[#a09d96]",
          "card-footer": "px-5 pb-5 pt-5",
          "card-action": "rounded-full bg-[#cc785c] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#a9583e]"
        }} id="look-men" />
        <Card title="爆款推荐" description="本周最受欢迎单品" content="羊毛双面呢大衣 / 修身针织连衣裙 / 复古厚底乐福鞋 / 软皮托特包" buttonLabel="查看榜单" classNames={{
          card: "rounded-[24px] border border-[#e6dfd8] bg-[#efe9de] p-7 row-start-11 row-end-14 col-start-1 col-end-12 z-1 sm:max-lg:row-start-14 sm:max-lg:row-end-17 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-26 max-sm:row-end-29 max-sm:col-start-1 max-sm:col-end-5",
          "card-title": "font-[Georgia] text-[30px] tracking-[-0.03em] text-[#141413]",
          "card-description": "mt-2 text-[15px] text-[#3d3d3a]",
          "card-content": "mt-5 text-[15px] leading-7 text-[#6c6a64]",
          "card-footer": "mt-6",
          "card-action": "rounded-full border border-[#d9d2c9] px-4 py-2 text-[14px] text-[#141413] transition hover:border-[#cc785c] hover:text-[#cc785c]"
        }} id="hot-products" />
        <Card title="新品上架" description="本季首发系列" content="轻羽绒短外套、绒感阔腿裤、纹理衬衫、极简皮靴同步到店。" buttonLabel="抢先预览" classNames={{
          card: "rounded-[24px] bg-[#faf9f5] p-7 shadow-[0_1px_3px_rgba(20,20,19,0.08)] row-start-11 row-end-14 col-start-12 col-end-23 z-1 sm:max-lg:row-start-17 sm:max-lg:row-end-19 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-29 max-sm:row-end-32 max-sm:col-start-1 max-sm:col-end-5",
          "card-title": "font-[Georgia] text-[30px] tracking-[-0.03em] text-[#141413]",
          "card-description": "mt-2 text-[15px] text-[#3d3d3a]",
          "card-content": "mt-5 text-[15px] leading-7 text-[#6c6a64]",
          "card-footer": "mt-6",
          "card-action": "rounded-full bg-[#cc785c] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#a9583e]"
        }} id="new-arrivals" />
      </Section>

      <Section id="content-section" columns={22} rows={9} height={942} columnGap={11} rowGap={11} responsive={{
        tablet: {
          columns: 12,
          rows: 17,
          height: 1429
        },
        mobile: {
          columns: 4,
          rows: 18,
          height: 1528,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#181715] px-6 py-10 sm:max-lg:px-5 max-sm:px-4">
        <Text content="穿搭场景 / 搭配指南" className="font-[Georgia] text-[46px] leading-none tracking-[-0.03em] text-[#faf9f5] sm:max-lg:text-[38px] max-sm:text-[30px] row-start-1 row-end-2 col-start-1 col-end-10 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="content-heading" />
        <Text content="用更像杂志专题的方式呈现灵感，帮助用户快速找到完整造型。" className="text-[16px] leading-7 text-[#a09d96] max-sm:text-[14px] max-sm:leading-6 row-start-2 row-end-3 col-start-1 col-end-10 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-10 max-sm:row-start-2 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5" id="content-subheading" />
        <Card imgSrc="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80" imgAlt="秋冬街头穿搭场景" title="城市出行场景" description="通勤、咖啡馆、周末逛展三种造型切换" content="以一件核心外套串联多套穿搭，提升购物决策效率，也减少无效搭配。" buttonLabel="阅读指南" classNames={{
          card: "overflow-hidden rounded-[24px] bg-[#252320] text-[#faf9f5] row-start-4 row-end-10 col-start-1 col-end-12 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-12 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-3 max-sm:row-end-11 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[62%] w-full object-cover",
          "card-header": "px-6 pt-5",
          "card-title": "font-[Georgia] text-[30px] tracking-[-0.03em] text-[#faf9f5]",
          "card-description": "mt-2 text-[15px] text-[#ebe6df]",
          "card-content": "px-6 pt-4 text-[14px] leading-6 text-[#a09d96]",
          "card-footer": "px-6 pb-6 pt-5",
          "card-action": "rounded-full bg-[#cc785c] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#a9583e]"
        }} id="scene-guide" />
        <Card title="搭配指南" description="色彩、层次、配饰三步完成整套感" content="1. 先定主单品；2. 用同色系过渡保持整洁；3. 选择一件有记忆点的包或鞋收束视线。" buttonLabel="获取清单" classNames={{
          card: "rounded-[24px] border border-white/10 bg-[#1f1e1b] p-7 text-[#faf9f5] row-start-4 row-end-7 col-start-12 col-end-23 z-1 sm:max-lg:row-start-12 sm:max-lg:row-end-15 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-11 max-sm:row-end-15 max-sm:col-start-1 max-sm:col-end-5",
          "card-title": "font-[Georgia] text-[28px] tracking-[-0.03em] text-[#faf9f5]",
          "card-description": "mt-3 text-[15px] text-[#ebe6df]",
          "card-content": "mt-5 text-[14px] leading-7 text-[#a09d96]",
          "card-footer": "mt-6",
          "card-action": "rounded-full border border-white/15 px-4 py-2 text-[14px] text-[#faf9f5] transition hover:border-[#cc785c] hover:text-white"
        }} id="match-guide" />
        <Card title="编辑精选" description="本周搭配关键词" content="燕麦色、炭灰、深酒红；针织打底、挺括外套、轻量配饰。" buttonLabel="查看专题" classNames={{
          card: "rounded-[24px] bg-[#faf9f5] p-7 text-[#141413] row-start-7 row-end-10 col-start-12 col-end-23 z-1 sm:max-lg:row-start-15 sm:max-lg:row-end-18 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-15 max-sm:row-end-19 max-sm:col-start-1 max-sm:col-end-5",
          "card-title": "text-[26px] font-medium text-[#141413]",
          "card-description": "mt-3 text-[15px] text-[#3d3d3a]",
          "card-content": "mt-5 text-[14px] leading-7 text-[#6c6a64]",
          "card-footer": "mt-6",
          "card-action": "rounded-full border border-[#d9d2c9] px-4 py-2 text-[14px] text-[#141413] transition hover:border-[#cc785c] hover:text-[#cc785c]"
        }} id="editor-picks" />
      </Section>

      <Section id="footer-section" columns={22} rows={6} height={360} columnGap={11} rowGap={11} responsive={{
        tablet: {
          columns: 12,
          rows: 9,
          height: 600
        },
        mobile: {
          columns: 4,
          rows: 12,
          height: 978,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#181715] px-6 py-8 sm:max-lg:px-5 max-sm:px-4">
        <Text content="ATELIER MODE" className="font-[Georgia] text-[28px] tracking-[0.18em] text-[#faf9f5] sm:max-lg:text-[24px] sm:max-lg:tracking-[0.12em] row-start-1 row-end-2 col-start-1 col-end-6 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-6 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="footer-brand" />
        <Text content="高质感日常衣橱品牌，提供女装、男装、鞋包配饰与门店试穿服务。" className="text-[14px] leading-7 text-[#a09d96] max-sm:text-[15px] max-sm:leading-8 row-start-2 row-end-4 col-start-1 col-end-7 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-4 sm:max-lg:col-start-1 sm:max-lg:col-end-6 max-sm:row-start-2 max-sm:row-end-4 max-sm:col-start-1 max-sm:col-end-5" id="footer-brand-info" />
        <Text content={"客服中心\n在线咨询 09:00-24:00\n售后热线 400-800-2024\n7 天无忧退换"} className="whitespace-pre-wrap text-[14px] leading-7 text-[#a09d96] max-sm:text-[15px] max-sm:leading-8 row-start-1 row-end-5 col-start-8 col-end-12 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-5 sm:max-lg:col-start-6 sm:max-lg:col-end-9 max-sm:row-start-4 max-sm:row-end-7 max-sm:col-start-1 max-sm:col-end-5" id="footer-service" />
        <Text content={"售后服务\n订单查询\n物流追踪\n门店自提\n尺码建议"} className="whitespace-pre-wrap text-[14px] leading-7 text-[#a09d96] row-start-1 row-end-5 col-start-13 col-end-16 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-5 sm:max-lg:col-start-9 sm:max-lg:col-end-11 max-sm:row-start-7 max-sm:row-end-10 max-sm:col-start-1 max-sm:col-end-5" id="footer-after-sales" />
        <Text content={"导航链接\n新品上架\n爆款推荐\n活动专区\n穿搭指南"} className="whitespace-pre-wrap text-[14px] leading-7 text-[#a09d96] row-start-1 row-end-5 col-start-17 col-end-20 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-8 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-10 max-sm:row-end-12 max-sm:col-start-1 max-sm:col-end-5" id="footer-links" />
        <Button label="订阅上新提醒" type="button" className="h-11 rounded-full bg-[#cc785c] px-5 text-[14px] font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#a9583e] row-start-1 row-end-2 col-start-20 col-end-23 z-1 sm:max-lg:row-start-6 sm:max-lg:row-end-7 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-12 max-sm:row-end-13 max-sm:col-start-1 max-sm:col-end-5" id="footer-button" />
      </Section>
    </Root>
  );
}
