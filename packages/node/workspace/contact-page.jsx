import { Button, Card, Carousel, Contact, Divider, Navbar, Root, Section, Social, Text } from "@/components";

export default function App() {
  return (
    <Root className="bg-[#faf7f1] text-[#1b1814]">
      <Section id="nav-section" columns={22} rows={2} height={88} columnGap={8} rowGap={8} responsive={{
        tablet: {
          columns: 12,
          rows: 2,
          height: 88
        },
        mobile: {
          columns: 4,
          rows: 2,
          height: 92
        }
      }} className="border-b border-[#e7dfd4] bg-[#faf7f1]">
        <Navbar brand="ATELIER MODE" logoAlt="ATELIER MODE 品牌标志" sticky items={[
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
            label: "新品",
            href: "#new"
          },
          {
            label: "折扣",
            href: "#sale"
          }
        ]} secondaryAction={{
          label: "搜索",
          href: "#search"
        }} primaryAction={{
          label: "购物车",
          href: "#cart"
        }} classNames={{
          navbar: "sticky top-0 rounded-none bg-[#faf7f1]/95 backdrop-blur-md row-start-1 row-end-3 col-start-1 col-end-23 z-50 sm:max-lg:row-start-1 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-3 max-sm:col-start-1 max-sm:col-end-5",
          "navbar-inner": "h-full px-8 max-sm:px-4",
          "navbar-brand": "font-serif text-[22px] tracking-[-0.04em] text-[#1b1814]",
          "navbar-nav-list": "justify-center gap-2",
          "navbar-nav-item": "rounded-full px-4 py-2 text-[14px] font-medium text-[#6b645b] transition-all duration-200 hover:bg-[#efe6d9] hover:text-[#1b1814]",
          "navbar-active-nav-item": "bg-[#efe6d9] text-[#1b1814]",
          "navbar-actions": "gap-3",
          "navbar-secondary-action": "rounded-full border border-[#ddd1c0] px-4 py-2 text-[14px] font-medium text-[#3d352d] transition-all duration-200 hover:border-[#c87557] hover:text-[#c87557]",
          "navbar-primary-action": "rounded-full bg-[#c87557] px-5 py-2 text-[14px] font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ab5f45]",
          "navbar-mobile-toggle": "border-[#ddd1c0] text-[#3d352d]",
          "navbar-mobile-panel": "border-[#e7dfd4] bg-[#faf7f1] px-4 py-4 shadow-lg"
        }} id="top-navbar" />
      </Section>

      <Section id="hero-section" columns={22} rows={12} height={980} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 12,
          height: 880
        },
        mobile: {
          columns: 4,
          rows: 14,
          height: 860,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf7f1] px-6 pt-6 pb-10 max-sm:px-4">
        <Carousel items={[
          {
            imgSrc: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "穿着米色风衣的模特站在极简空间中",
            title: "秋冬新章",
            description: "高支羊毛、利落廓形与柔和暖调，开启本季主打穿搭。"
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "模特展示都市通勤风格服装",
            title: "都市衣橱",
            description: "通勤、周末与晚间场合，一套完成风格切换。"
          },
          {
            imgSrc: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
            imgAlt: "模特穿着层次感搭配站在街头",
            title: "限时满减",
            description: "精选单品两件 88 折，活动专区同步开放。"
          }
        ]} classNames={{
          carousel: "overflow-hidden rounded-[28px] border border-[#e6ddd2] bg-[#1d1916] shadow-[0_20px_60px_rgba(41,28,19,0.12)] row-start-1 row-end-13 col-start-1 col-end-23 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-13 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-15 max-sm:col-start-1 max-sm:col-end-5",
          "carousel-content": "h-full",
          "carousel-item": "relative h-full",
          "carousel-item-img": "h-full w-full object-cover",
          "carousel-item-title": "absolute left-10 top-16 max-w-[520px] font-serif text-[72px] leading-[0.96] tracking-[-0.06em] text-[#fffaf3] sm:max-lg:left-8 sm:max-lg:top-14 sm:max-lg:text-[56px] max-sm:left-5 max-sm:top-10 max-sm:max-w-[280px] max-sm:text-[34px]",
          "carousel-item-description": "absolute left-10 top-56 max-w-[440px] text-[18px] leading-8 text-[#f4ecdf] sm:max-lg:left-8 sm:max-lg:top-44 sm:max-lg:max-w-[360px] max-sm:left-5 max-sm:top-36 max-sm:max-w-[260px] max-sm:text-[15px] max-sm:leading-6",
          "carousel-previous": "left-6 h-12 w-12 -translate-y-1/2 rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 max-sm:left-4",
          "carousel-next": "right-6 h-12 w-12 -translate-y-1/2 rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 max-sm:right-4"
        }} id="hero-carousel" />
      </Section>

      <Section id="promo-section" columns={22} rows={4} height={280} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 8,
          height: 500
        },
        mobile: {
          columns: 4,
          rows: 10,
          height: 752,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf7f1] px-6 py-4 max-sm:px-4">
        <Card title="会员礼遇周" description="全场包邮 / 新客 9 折 / 指定品类折上折" content="本周主推通勤西装、针织套装与轻户外系列，支持门店自提与七天无忧换码。" buttonLabel="进入会场" classNames={{
          card: "flex border border-[#d36f50] bg-[#c87557] p-8 text-white shadow-[0_12px_30px_rgba(200,117,87,0.18)] row-start-1 row-end-5 col-start-1 col-end-11 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-5 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-1 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5",
          "card-header": "space-y-3",
          "card-title": "font-serif text-[34px] leading-[1.05] tracking-[-0.04em] max-sm:text-[28px]",
          "card-description": "text-[16px] font-medium text-[#fff2ea]",
          "card-content": "text-[15px] leading-7 text-[#fff6f0]",
          "card-footer": "pt-6",
          "card-action": "rounded-full bg-[#faf7f1] px-5 py-3 text-[14px] font-medium text-[#8e4d38] transition hover:-translate-y-0.5 hover:bg-white"
        }} id="promo-main-card" />
        <Card title="限时优惠" description="领券最高减 300" content="每日 10:00 / 20:00 更新爆款券包，覆盖女装、男装与鞋包。" buttonLabel="立即领取" classNames={{
          card: "border border-[#e5dccf] bg-[#efe7dc] p-7 text-[#1b1814] row-start-1 row-end-5 col-start-11 col-end-17 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-9 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-5 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5",
          "card-header": "space-y-2",
          "card-title": "font-serif text-[26px] tracking-[-0.03em]",
          "card-description": "text-[15px] font-medium text-[#6f6559]",
          "card-content": "text-[14px] leading-6 text-[#4c4339]",
          "card-footer": "pt-5",
          "card-action": "rounded-full border border-[#d5c7b7] px-4 py-2 text-[14px] font-medium text-[#3d352d] transition hover:border-[#c87557] hover:text-[#c87557]"
        }} id="promo-coupon-card" />
        <Card title="专属服务" description="搭配顾问在线" content="输入场景关键词，即可快速查看场景穿搭与热销组合。" buttonLabel="查看指南" classNames={{
          card: "border border-[#e5dccf] bg-[#f4eee4] p-7 text-[#1b1814] row-start-1 row-end-5 col-start-17 col-end-23 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-9 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-8 max-sm:row-end-11 max-sm:col-start-1 max-sm:col-end-5",
          "card-header": "space-y-2",
          "card-title": "font-serif text-[26px] tracking-[-0.03em]",
          "card-description": "text-[15px] font-medium text-[#6f6559]",
          "card-content": "text-[14px] leading-6 text-[#4c4339]",
          "card-footer": "pt-5",
          "card-action": "rounded-full border border-[#d5c7b7] px-4 py-2 text-[14px] font-medium text-[#3d352d] transition hover:border-[#c87557] hover:text-[#c87557]"
        }} id="promo-service-card" />
      </Section>

      <Section id="products-section" columns={22} rows={15} height={1372} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 24,
          height: 2164
        },
        mobile: {
          columns: 4,
          rows: 34,
          height: 3220,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf7f1] px-6 py-8 max-sm:px-4">
        <Text content="精选商品" className="font-serif text-[46px] leading-none tracking-[-0.05em] text-[#1b1814] max-sm:text-[34px] row-start-1 row-end-2 col-start-1 col-end-7 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-6 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="products-heading" />
        <Text content="分类穿搭、爆款推荐与新品上架，按场景快速完成当季选购。" className="text-[16px] leading-7 text-[#5e564d] row-start-2 row-end-3 col-start-1 col-end-10 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-9 max-sm:row-start-2 max-sm:row-end-4 max-sm:col-start-1 max-sm:col-end-5" id="products-subheading" />
        <Card imgSrc="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80" imgAlt="米白色女式西装外套" title="通勤西装外套" description="分类穿搭" content="挺括剪裁，适配衬衫、半裙与长裤的三种工作日搭配。" buttonLabel="加入购物车" classNames={{
          card: "overflow-hidden rounded-[18px] border border-[#e5dccf] bg-[#f3ede4] row-start-4 row-end-10 col-start-1 col-end-6 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-10 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-5 max-sm:row-end-11 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[290px] w-full object-cover max-sm:h-[220px]",
          "card-header": "px-6 pt-5 space-y-1",
          "card-title": "font-serif text-[28px] leading-[1.05] tracking-[-0.03em]",
          "card-description": "text-[13px] uppercase tracking-[0.18em] text-[#8a7b6a]",
          "card-content": "px-6 pt-3 text-[14px] leading-6 text-[#4c4339]",
          "card-footer": "px-6 py-6",
          "card-action": "rounded-full bg-[#1b1814] px-4 py-2 text-[14px] font-medium text-[#faf7f1] transition hover:-translate-y-0.5 hover:bg-[#34302b]"
        }} id="product-card-1" />
        <Card imgSrc="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80" imgAlt="深色男士长风衣穿搭" title="长风衣套装" description="爆款推荐" content="层次叠穿的秋冬核心单品，深色系更适合都市日常。" buttonLabel="查看详情" classNames={{
          card: "overflow-hidden rounded-[18px] border border-[#e5dccf] bg-[#f7f2ea] row-start-4 row-end-10 col-start-6 col-end-12 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-10 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-11 max-sm:row-end-17 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[290px] w-full object-cover max-sm:h-[220px]",
          "card-header": "px-6 pt-5 space-y-1",
          "card-title": "font-serif text-[28px] leading-[1.05] tracking-[-0.03em]",
          "card-description": "text-[13px] uppercase tracking-[0.18em] text-[#8a7b6a]",
          "card-content": "px-6 pt-3 text-[14px] leading-6 text-[#4c4339]",
          "card-footer": "px-6 py-6",
          "card-action": "rounded-full bg-[#c87557] px-4 py-2 text-[14px] font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#ab5f45]"
        }} id="product-card-2" />
        <Card imgSrc="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80" imgAlt="米色针织上衣与半裙组合" title="针织半裙组合" description="新品上架" content="软糯触感与收腰比例兼顾，适合通勤与轻社交场景。" buttonLabel="立即选购" classNames={{
          card: "overflow-hidden rounded-[18px] border border-[#e5dccf] bg-[#efe7dc] row-start-4 row-end-10 col-start-12 col-end-18 z-1 sm:max-lg:row-start-10 sm:max-lg:row-end-17 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-17 max-sm:row-end-23 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[290px] w-full object-cover max-sm:h-[220px]",
          "card-header": "px-6 pt-5 space-y-1",
          "card-title": "font-serif text-[28px] leading-[1.05] tracking-[-0.03em]",
          "card-description": "text-[13px] uppercase tracking-[0.18em] text-[#8a7b6a]",
          "card-content": "px-6 pt-3 text-[14px] leading-6 text-[#4c4339]",
          "card-footer": "px-6 py-6",
          "card-action": "rounded-full border border-[#d1c3b3] px-4 py-2 text-[14px] font-medium text-[#3d352d] transition hover:border-[#c87557] hover:text-[#c87557]"
        }} id="product-card-3" />
        <Card imgSrc="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80" imgAlt="模特展示浅色叠穿造型" title="轻暖叠穿系列" description="场景精选" content="以针织、衬衫和轻薄外套构成更适合换季的完整层次。" buttonLabel="浏览系列" classNames={{
          card: "overflow-hidden rounded-[18px] border border-[#e5dccf] bg-[#f4eee4] row-start-4 row-end-10 col-start-18 col-end-23 z-1 sm:max-lg:row-start-10 sm:max-lg:row-end-17 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-23 max-sm:row-end-29 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[290px] w-full object-cover max-sm:h-[220px]",
          "card-header": "px-6 pt-5 space-y-1",
          "card-title": "font-serif text-[28px] leading-[1.05] tracking-[-0.03em]",
          "card-description": "text-[13px] uppercase tracking-[0.18em] text-[#8a7b6a]",
          "card-content": "px-6 pt-3 text-[14px] leading-6 text-[#4c4339]",
          "card-footer": "px-6 py-6",
          "card-action": "rounded-full border border-[#d1c3b3] px-4 py-2 text-[14px] font-medium text-[#3d352d] transition hover:border-[#c87557] hover:text-[#c87557]"
        }} id="product-card-4" />
        <Card title="爆款推荐：本季主推廓形大衣" description="编辑精选" content="用更利落的肩线和更温和的暖灰、驼色，重构秋冬高频衣橱。" buttonLabel="查看搭配" classNames={{
          card: "border border-[#24201c] bg-[#1e1a17] p-8 text-[#faf7f1] row-start-11 row-end-16 col-start-1 col-end-13 z-1 sm:max-lg:row-start-18 sm:max-lg:row-end-25 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-29 max-sm:row-end-33 max-sm:col-start-1 max-sm:col-end-5",
          "card-header": "space-y-2",
          "card-title": "font-serif text-[36px] leading-[1.02] tracking-[-0.04em] max-sm:text-[28px]",
          "card-description": "text-[13px] uppercase tracking-[0.18em] text-[#b7ab9b]",
          "card-content": "text-[15px] leading-7 text-[#ddd1c4]",
          "card-footer": "pt-6",
          "card-action": "rounded-full bg-[#c87557] px-5 py-3 text-[14px] font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#ab5f45]"
        }} id="product-feature-banner" />
        <Card title="新品上架节奏" description="每周三 / 周五 10:00" content="保持少量上新，让热门尺码和搭配组合更好追踪。" buttonLabel="订阅提醒" classNames={{
          card: "sm:max-lg:hidden max-sm:hidden border border-[#e5dccf] bg-[#efe7dc] p-8 row-start-11 row-end-16 col-start-13 col-end-23 z-1",
          "card-header": "space-y-2",
          "card-title": "font-serif text-[32px] leading-[1.06] tracking-[-0.04em]",
          "card-description": "text-[14px] font-medium text-[#6f6559]",
          "card-content": "text-[15px] leading-7 text-[#4c4339]",
          "card-footer": "pt-6",
          "card-action": "rounded-full border border-[#d1c3b3] px-5 py-3 text-[14px] font-medium text-[#3d352d] transition hover:border-[#c87557] hover:text-[#c87557]"
        }} id="product-mini-banner" />
      </Section>

      <Section id="content-section" columns={22} rows={8} height={700} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 12,
          height: 1216
        },
        mobile: {
          columns: 4,
          rows: 16,
          height: 1360,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#f2eadf] px-6 py-8 max-sm:px-4">
        <Text content="穿搭场景与搭配指南" className="font-serif text-[42px] leading-none tracking-[-0.05em] text-[#1b1814] max-sm:text-[32px] row-start-1 row-end-2 col-start-1 col-end-9 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-8 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="content-heading" />
        <Card title="场景穿搭" description="从早八通勤到周末出行" content="根据天气、色系和场合给出一组完成度更高的上下装与配饰建议。" buttonLabel="查看场景" imgSrc="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=80" imgAlt="模特站在窗边展示简洁穿搭" classNames={{
          card: "overflow-hidden rounded-[20px] border border-[#e4d9ca] bg-[#faf7f1] row-start-3 row-end-9 col-start-1 col-end-12 z-1 sm:max-lg:row-start-3 sm:max-lg:row-end-8 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-3 max-sm:row-end-9 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[250px] w-full object-cover max-sm:h-[220px]",
          "card-header": "px-6 pt-5 space-y-2",
          "card-title": "font-serif text-[30px] tracking-[-0.03em]",
          "card-description": "text-[15px] font-medium text-[#6f6559]",
          "card-content": "px-6 pt-2 text-[14px] leading-6 text-[#4c4339]",
          "card-footer": "px-6 py-6",
          "card-action": "rounded-full bg-[#1b1814] px-4 py-2 text-[14px] font-medium text-[#faf7f1] transition hover:bg-[#34302b]"
        }} id="scene-card" />
        <Card title="搭配指南" description="版型、材质与配色建议" content="用简单规则解决显瘦比例、层次叠穿和基础色互搭，让选购更直接。" buttonLabel="阅读指南" imgSrc="https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=1000&q=80" imgAlt="桌面上的服装搭配与时尚杂志" classNames={{
          card: "overflow-hidden rounded-[20px] border border-[#e4d9ca] bg-[#1e1a17] text-[#faf7f1] row-start-3 row-end-9 col-start-12 col-end-23 z-1 sm:max-lg:row-start-8 sm:max-lg:row-end-13 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-9 max-sm:row-end-15 max-sm:col-start-1 max-sm:col-end-5",
          "card-img": "h-[250px] w-full object-cover max-sm:h-[220px]",
          "card-header": "px-6 pt-5 space-y-2",
          "card-title": "font-serif text-[30px] tracking-[-0.03em]",
          "card-description": "text-[15px] font-medium text-[#c8bbaa]",
          "card-content": "px-6 pt-2 text-[14px] leading-6 text-[#ddd1c4]",
          "card-footer": "px-6 py-6",
          "card-action": "rounded-full bg-[#c87557] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[#ab5f45]"
        }} id="guide-card" />
      </Section>

      <Section id="contact-section" columns={22} rows={10} height={740} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 13,
          height: 980
        },
        mobile: {
          columns: 4,
          rows: 15,
          height: 1080,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#faf7f1] px-6 py-8 max-sm:px-4">
        <Text content="联系顾问" className="font-serif text-[44px] leading-none tracking-[-0.05em] text-[#1b1814] max-sm:text-[34px] row-start-1 row-end-2 col-start-1 col-end-8 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="contact-heading" />
        <Text content="留下需求、尺码偏好或预约到店时间，我们会在 24 小时内与您联系。" className="text-[16px] leading-7 text-[#5e564d] row-start-2 row-end-3 col-start-1 col-end-10 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-3 sm:max-lg:col-start-1 sm:max-lg:col-end-9 max-sm:row-start-2 max-sm:row-end-4 max-sm:col-start-1 max-sm:col-end-5" id="contact-subheading" />
        <Card title="服务说明" description="一对一风格建议" content="支持咨询新品试穿、尺码推荐、搭配方案与门店预约。工作时间内将优先回复。" buttonLabel="查看门店" classNames={{
          card: "border border-[#24201c] bg-[#1e1a17] p-8 text-[#faf7f1] row-start-4 row-end-10 col-start-1 col-end-9 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-8 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-4 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-5",
          "card-header": "space-y-2",
          "card-title": "font-serif text-[34px] leading-[1.04] tracking-[-0.04em] max-sm:text-[28px]",
          "card-description": "text-[13px] uppercase tracking-[0.18em] text-[#b7ab9b]",
          "card-content": "pt-3 text-[15px] leading-7 text-[#ddd1c4]",
          "card-footer": "pt-6",
          "card-action": "rounded-full bg-[#c87557] px-5 py-3 text-[14px] font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#ab5f45]"
        }} id="contact-service-card" />
        <Contact labels={{
          name: "姓名",
          email: "邮箱",
          message: "需求说明"
        }} placeholders={{
          name: "请输入您的姓名",
          email: "请输入常用邮箱",
          message: "例如：想预约试穿、咨询尺码或获取穿搭建议"
        }} buttonLabel="提交咨询" classNames={{
          contact: "rounded-[20px] border border-[#e4d9ca] bg-[#f3ede4] p-8 row-start-4 row-end-10 col-start-10 col-end-23 z-1 sm:max-lg:row-start-8 sm:max-lg:row-end-14 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-8 max-sm:row-end-16 max-sm:col-start-1 max-sm:col-end-5",
          "contact-field-group": "grid grid-cols-2 gap-5 max-sm:grid-cols-1",
          "contact-field": "flex flex-col gap-2",
          "contact-field-label": "text-[13px] font-medium uppercase tracking-[0.16em] text-[#6f6559]",
          "contact-input": "h-12 rounded-[10px] border border-[#d8cbbc] bg-[#faf7f1] px-4 text-[15px] text-[#1b1814] transition duration-200 placeholder:text-[#9b8f82] focus-visible:outline-[#c87557]",
          "contact-textarea": "min-h-[160px] rounded-[10px] border border-[#d8cbbc] bg-[#faf7f1] px-4 py-3 text-[15px] text-[#1b1814] transition duration-200 placeholder:text-[#9b8f82] focus-visible:outline-[#c87557] col-span-2 max-sm:col-span-1",
          "contact-button": "mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#c87557] px-6 text-[14px] font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#ab5f45]"
        }} id="contact-form" />
      </Section>

      <Section id="footer-section" columns={22} rows={7} height={420} columnGap={12} rowGap={12} responsive={{
        tablet: {
          columns: 12,
          rows: 13,
          height: 760
        },
        mobile: {
          columns: 4,
          rows: 16,
          height: 920,
          columnGap: 10,
          rowGap: 10
        }
      }} className="bg-[#1b1814] px-6 py-8 text-[#f7f1e8] max-sm:px-4">
        <Text content="ATELIER MODE" className="font-serif text-[34px] tracking-[-0.05em] text-[#faf7f1] sm:max-lg:text-[30px] row-start-1 row-end-2 col-start-1 col-end-6 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-2 sm:max-lg:col-start-1 sm:max-lg:col-end-5 max-sm:row-start-1 max-sm:row-end-2 max-sm:col-start-1 max-sm:col-end-5" id="footer-brand" />
        <Text content="以更克制的色彩与利落的廓形，提供适合城市日常的当季衣橱。" className="text-[14px] leading-7 text-[#c8bbaa] row-start-2 row-end-4 col-start-1 col-end-7 z-1 sm:max-lg:row-start-2 sm:max-lg:row-end-4 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-2 max-sm:row-end-4 max-sm:col-start-1 max-sm:col-end-5" id="footer-brand-copy" />
        <Social items={[
          {
            href: "#instagram",
            icon: "instagram"
          },
          {
            href: "#facebook",
            icon: "facebook"
          },
          {
            href: "#x",
            icon: "x"
          }
        ]} classNames={{
          social: "flex gap-3 row-start-4 row-end-5 col-start-1 col-end-5 z-1 sm:max-lg:row-start-4 sm:max-lg:row-end-5 sm:max-lg:col-start-1 sm:max-lg:col-end-4 max-sm:row-start-4 max-sm:row-end-5 max-sm:col-start-1 max-sm:col-end-5",
          "social-item": "flex h-10 w-10 items-center justify-center rounded-full border border-[#3a342e] text-[#f7f1e8] transition hover:border-[#c87557] hover:text-[#c87557]"
        }} id="footer-social" />
        <Divider orientation="horizontal" className="border-[#332d28] row-start-5 row-end-6 col-start-1 col-end-23 z-1 sm:max-lg:row-start-5 sm:max-lg:row-end-6 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-13 max-sm:row-end-14 max-sm:col-start-1 max-sm:col-end-5" id="footer-divider" />
        <Text content={"品牌信息\n关于我们\n门店地址\n品牌故事"} className="whitespace-pre-wrap text-[14px] leading-8 text-[#c8bbaa] row-start-1 row-end-5 col-start-9 col-end-12 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-5 sm:max-lg:col-start-7 sm:max-lg:col-end-10 max-sm:row-start-5 max-sm:row-end-8 max-sm:col-start-1 max-sm:col-end-3" id="footer-info" />
        <Text content={"客服支持\n在线咨询\n配送说明\n发票服务"} className="whitespace-pre-wrap text-[14px] leading-8 text-[#c8bbaa] row-start-1 row-end-5 col-start-13 col-end-16 z-1 sm:max-lg:row-start-1 sm:max-lg:row-end-5 sm:max-lg:col-start-10 sm:max-lg:col-end-13 max-sm:row-start-5 max-sm:row-end-8 max-sm:col-start-3 max-sm:col-end-5" id="footer-service" />
        <Text content={"售后帮助\n退换政策\n尺码建议\n洗护指南"} className="whitespace-pre-wrap text-[14px] leading-8 text-[#c8bbaa] row-start-1 row-end-5 col-start-17 col-end-20 z-1 sm:max-lg:row-start-6 sm:max-lg:row-end-9 sm:max-lg:col-start-7 sm:max-lg:col-end-10 max-sm:row-start-8 max-sm:row-end-11 max-sm:col-start-1 max-sm:col-end-3" id="footer-after-sales" />
        <Text content={"快捷导航\n新品上架\n热销榜单\n活动专区"} className="whitespace-pre-wrap text-[14px] leading-8 text-[#c8bbaa] row-start-1 row-end-5 col-start-20 col-end-23 z-1 sm:max-lg:row-start-6 sm:max-lg:row-end-9 sm:max-lg:col-start-10 sm:max-lg:col-end-13 max-sm:row-start-8 max-sm:row-end-11 max-sm:col-start-3 max-sm:col-end-5" id="footer-nav-links" />
        <Text content="© 2026 ATELIER MODE. All rights reserved." className="text-[13px] text-[#8f8376] row-start-6 row-end-7 col-start-1 col-end-9 z-1 sm:max-lg:row-start-12 sm:max-lg:row-end-13 sm:max-lg:col-start-1 sm:max-lg:col-end-8 max-sm:row-start-14 max-sm:row-end-15 max-sm:col-start-1 max-sm:col-end-5" id="footer-copyright" />
        <Button label="联系顾问" type="button" className="justify-center rounded-full bg-[#c87557] px-5 py-3 text-[14px] font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#ab5f45] row-start-6 row-end-7 col-start-19 col-end-23 z-1 sm:max-lg:row-start-12 sm:max-lg:row-end-13 sm:max-lg:col-start-9 sm:max-lg:col-end-13 max-sm:row-start-15 max-sm:row-end-16 max-sm:col-start-1 max-sm:col-end-5" id="footer-contact-button" />
      </Section>
    </Root>
  );
}
