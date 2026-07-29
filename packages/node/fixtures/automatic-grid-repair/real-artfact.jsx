import {
  Button,
  Card,
  Carousel,
  Divider,
  Image,
  Navbar,
  Root,
  Section,
  Text,
} from "@/components";

export default function App() {
  return (
    <Root
      id="fashion-root"
      className="bg-[#faf7f2] text-[#181613] [font-family:Inter,sans-serif]"
    >
      <Section
        id="nav-section"
        columns={22}
        rows={4}
        height={92}
        columnGap={10}
        rowGap={10}
        responsive={{
          tablet: { columns: 12, rows: 4, height: 92 },
          mobile: { columns: 4, rows: 4, height: 92 },
        }}
        className="border-b border-[#e7ddd0] bg-[#faf7f2]/95 backdrop-blur"
      >
        <Navbar
          id="top-navbar"
          brand="LUMIÈRE"
          logoSrc="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=120&q=80"
          logoAlt="LUMIÈRE 品牌标志"
          sticky
          items={[
            { label: "女装", href: "#women", active: true },
            { label: "男装", href: "#men" },
            { label: "鞋履", href: "#shoes" },
            { label: "包袋", href: "#bags" },
            { label: "配饰", href: "#accessories" },
          ]}
          primaryAction={{ label: "购物车 02", href: "#cart" }}
          secondaryAction={{ label: "搜索", href: "#search" }}
          classNames={{
            navbar:
              "row-start-1 row-end-5 col-start-1 col-end-23 sm:max-lg:col-end-13 max-sm:col-end-5 sticky top-0 z-50 rounded-none bg-transparent",
            "navbar-inner":
              "h-full bg-[#faf7f2]/95 px-8 sm:max-lg:px-5 max-sm:px-4 py-4",
            "navbar-logo": "h-9 w-9 rounded-full object-cover",
            "navbar-brand":
              "min-w-fit gap-3 text-[15px] font-semibold tracking-[0.28em] text-[#171512]",
            "navbar-nav-list":
              "justify-center gap-2 text-center [font-family:Inter,sans-serif]",
            "navbar-nav-item":
              "rounded-full px-4 py-2 text-[14px] font-medium text-[#6e665d] transition duration-200 hover:-translate-y-0.5 hover:bg-[#efe5d8] hover:text-[#171512]",
            "navbar-active-nav-item": "bg-[#efe5d8] text-[#171512]",
            "navbar-actions": "gap-3",
            "navbar-primary-action":
              "rounded-full bg-[#181613] px-5 py-2.5 text-[14px] font-medium text-[#faf7f2] transition duration-200 hover:-translate-y-0.5 hover:bg-[#2a2620]",
            "navbar-secondary-action":
              "rounded-full border border-[#dfd3c3] bg-[#f5eee4] px-4 py-2.5 text-[14px] font-medium text-[#171512] transition duration-200 hover:-translate-y-0.5 hover:bg-[#efe5d8]",
            "navbar-mobile-toggle":
              "ml-auto border border-[#dfd3c3] bg-[#f5eee4] text-[#171512]",
            "navbar-mobile-panel":
              "border-t border-[#e7ddd0] bg-[#faf7f2] px-4 py-4 shadow-[0_12px_30px_rgba(24,22,19,0.08)]",
          }}
        />
      </Section>

      <Section
        id="hero-section"
        columns={22}
        rows={12}
        height={920}
        columnGap={10}
        rowGap={10}
        responsive={{
          tablet: { columns: 12, rows: 12, height: 860 },
          mobile: {
            columns: 4,
            rows: 12,
            height: 760,
            columnGap: 8,
            rowGap: 8,
          },
        }}
        className="bg-[#f7f1e7] px-6 py-6 sm:max-lg:px-5 max-sm:px-3"
      >
        <Carousel
          id="hero-carousel"
          items={[
            {
              imgSrc:
                "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1600&q=80",
              imgAlt: "身穿浅米色时装的模特站在暖色背景前",
              title: "秋冬新章",
              description: "8K 质感大片｜轻奢廓形，重塑日常衣橱",
            },
            {
              imgSrc:
                "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
              imgAlt: "模特展示都市通勤穿搭",
              title: "都会漫游",
              description: "满额赠礼进行中｜利落层次，穿出从容气场",
            },
            {
              imgSrc:
                "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=80",
              imgAlt: "模特身着黑白极简系列成衣",
              title: "黑白精选",
              description: "热门单品限时加购｜用经典比例定义高级感",
            },
          ]}
          classNames={{
            carousel:
              "row-start-1 row-end-13 col-start-1 col-end-23 sm:max-lg:col-end-13 max-sm:col-end-5 h-full overflow-hidden rounded-[28px] border border-[#e4d8c7] bg-[#181613]",
            "carousel-content": "h-full",
            "carousel-item": "relative h-full",
            "carousel-item-img":
              "h-full w-full object-cover object-center opacity-90",
            "carousel-item-title":
              "absolute left-12 top-20 max-w-[420px] [font-family:Georgia,serif] text-[76px] leading-[0.95] tracking-[-0.05em] text-[#fffaf3] sm:max-lg:left-8 sm:max-lg:top-16 sm:max-lg:text-[56px] max-sm:left-5 max-sm:top-16 max-sm:max-w-[260px] max-sm:text-[34px]",
            "carousel-item-description":
              "absolute left-12 top-[360px] max-w-[440px] text-[18px] leading-8 text-[#f4eadb] sm:max-lg:left-8 sm:max-lg:top-[290px] sm:max-lg:max-w-[360px] max-sm:left-5 max-sm:top-[210px] max-sm:max-w-[250px] max-sm:text-[15px] max-sm:leading-6",
            "carousel-previous":
              "left-6 top-auto bottom-8 h-12 w-12 -translate-y-0 rounded-full border border-white/20 bg-black/25 text-white backdrop-blur transition duration-200 hover:bg-black/40 max-sm:left-4 max-sm:h-10 max-sm:w-10",
            "carousel-next":
              "right-6 top-auto bottom-8 h-12 w-12 -translate-y-0 rounded-full border border-white/20 bg-black/25 text-white backdrop-blur transition duration-200 hover:bg-black/40 max-sm:right-4 max-sm:h-10 max-sm:w-10",
          }}
        />
      </Section>

      <Section
        id="promo-section"
        columns={22}
        rows={6}
        height={320}
        columnGap={10}
        rowGap={10}
        responsive={{
          tablet: { columns: 12, rows: 8, height: 420 },
          mobile: {
            columns: 4,
            rows: 12,
            height: 620,
            columnGap: 8,
            rowGap: 8,
          },
        }}
        className="bg-[#faf7f2] px-6 py-6 sm:max-lg:px-5 max-sm:px-3"
      >
        <Card
          id="promo-main-card"
          title="全场焕新礼遇"
          description="会员下单满 999 享 85 折，精选外套加赠真丝围巾。"
          content="限时福利专区同步开启：新品首发价、组合穿搭券、到店试衣预约。"
          buttonLabel="立即抢购"
          classNames={{
            card: "row-start-1 row-end-7 col-start-1 col-end-11 sm:max-lg:row-end-5 sm:max-lg:col-end-8 max-sm:row-start-1 max-sm:row-end-5 max-sm:col-end-5 flex justify-between rounded-[24px] bg-[#cb785d] px-8 py-8 text-[#fffaf3]",
            "card-header": "space-y-3",
            "card-title":
              "[font-family:Georgia,serif] text-[42px] leading-[1.02] tracking-[-0.04em] max-sm:text-[28px]",
            "card-description":
              "text-[18px] leading-7 text-[#fff4ea] max-sm:text-[15px]",
            "card-content": "text-[15px] leading-7 text-[#fff1e4]",
            "card-footer": "pt-4",
            "card-action":
              "rounded-full bg-[#fffaf3] px-5 py-3 text-[14px] font-semibold text-[#181613] transition duration-200 hover:-translate-y-0.5 hover:bg-[#f8eee2]",
          }}
        />
        <Card
          id="promo-entry-one"
          title="限时折上折"
          description="爆款针织 / 大衣专区"
          content="低至 7 折"
          buttonLabel="进入专区"
          classNames={{
            card: "row-start-1 row-end-4 col-start-11 col-end-17 sm:max-lg:row-start-1 sm:max-lg:row-end-5 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-5 max-sm:row-end-9 max-sm:col-start-1 max-sm:col-end-5 rounded-[22px] border border-[#e6dccf] bg-[#f1e8dc] px-6 py-6 text-[#181613]",
            "card-header": "space-y-2",
            "card-title": "text-[24px] font-semibold",
            "card-description": "text-[15px] text-[#625b54]",
            "card-content": "pt-8 text-[30px] [font-family:Georgia,serif]",
            "card-footer": "pt-6",
            "card-action":
              "rounded-full border border-[#d8ccbd] px-4 py-2 text-[13px] font-medium transition duration-200 hover:bg-[#eadfce]",
          }}
        />
        <Card
          id="promo-entry-two"
          title="搭配顾问"
          description="按场景推荐完整造型"
          content="通勤 / 度假 / 晚宴"
          buttonLabel="查看指南"
          classNames={{
            card: "row-start-1 row-end-4 col-start-17 col-end-23 sm:max-lg:row-start-5 sm:max-lg:row-end-9 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-9 max-sm:row-end-13 max-sm:col-start-1 max-sm:col-end-5 rounded-[22px] border border-[#e6dccf] bg-[#181613] px-6 py-6 text-[#fffaf3]",
            "card-header": "space-y-2",
            "card-title": "text-[24px] font-semibold",
            "card-description": "text-[15px] text-[#c6bbab]",
            "card-content": "pt-8 text-[18px] text-[#f0e4d4]",
            "card-footer": "pt-6",
            "card-action":
              "rounded-full bg-[#2a2620] px-4 py-2 text-[13px] font-medium transition duration-200 hover:bg-[#343028]",
          }}
        />
        <Card
          id="promo-entry-three"
          title="线下门店"
          description="预约试穿与尺码服务"
          content="全国 36 城可约"
          buttonLabel="立即预约"
          classNames={{
            card: "row-start-4 row-end-7 col-start-11 col-end-23 sm:max-lg:row-start-5 sm:max-lg:row-end-9 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:hidden rounded-[22px] border border-[#e6dccf] bg-[#fffdf9] px-6 py-6 text-[#181613]",
            "card-header": "space-y-2",
            "card-title": "text-[24px] font-semibold",
            "card-description": "text-[15px] text-[#625b54]",
            "card-content": "pt-8 text-[18px] [font-family:Georgia,serif]",
            "card-footer": "pt-6",
            "card-action":
              "rounded-full border border-[#d8ccbd] px-4 py-2 text-[13px] font-medium transition duration-200 hover:bg-[#f5eee4]",
          }}
        />
      </Section>

      <Section
        id="product-section"
        columns={22}
        rows={14}
        height={1180}
        columnGap={10}
        rowGap={10}
        responsive={{
          tablet: { columns: 12, rows: 18, height: 1680 },
          mobile: {
            columns: 4,
            rows: 26,
            height: 2820,
            columnGap: 8,
            rowGap: 8,
          },
        }}
        className="bg-[#faf7f2] px-6 py-6 sm:max-lg:px-5 max-sm:px-3"
      >
        <Text
          id="product-section-kicker"
          content="SHOP BY EDIT"
          className="row-start-1 row-end-2 col-start-1 col-end-6 sm:max-lg:col-end-5 max-sm:col-end-5 text-[12px] font-semibold tracking-[0.26em] text-[#8a7d6e]"
        />
        <Text
          id="product-section-title"
          content="分类穿搭、爆款推荐与新品上架"
          className="row-start-2 row-end-4 col-start-1 col-end-13 sm:max-lg:col-end-9 max-sm:row-start-2 max-sm:row-end-4 max-sm:col-end-5 [font-family:Georgia,serif] text-[50px] leading-[1.02] tracking-[-0.04em] text-[#171512] max-sm:text-[30px]"
        />
        <Text
          id="product-section-copy"
          content="以清晰网格梳理本季衣橱：通勤套装、周末轻行、社交晚装与人气单品一目了然。"
          className="row-start-2 row-end-4 col-start-14 col-end-23 sm:max-lg:row-start-4 sm:max-lg:row-end-6 sm:max-lg:col-start-1 sm:max-lg:col-end-9 max-sm:row-start-4 max-sm:row-end-6 max-sm:col-end-5 text-[16px] leading-7 text-[#5e564e]"
        />
        <Card
          id="product-card-commute"
          imgSrc="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80"
          imgAlt="米色西装与长裤通勤穿搭"
          title="分类穿搭｜都市通勤"
          description="干练西装、垂坠长裤与低跟鞋，一套完成工作日造型。"
          content="精选 42 件"
          buttonLabel="查看系列"
          classNames={{
            card: "row-start-5 row-end-10 col-start-1 col-end-8 sm:max-lg:row-start-7 sm:max-lg:row-end-12 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-7 max-sm:row-end-12 max-sm:col-end-5 overflow-hidden rounded-[24px] border border-[#e6dccf] bg-[#fffdf9]",
            "card-img": "h-[58%] w-full object-cover",
            "card-header": "space-y-2 px-6 pt-5",
            "card-title": "text-[24px] font-semibold text-[#171512]",
            "card-description": "text-[15px] leading-6 text-[#625b54]",
            "card-content":
              "px-6 pt-5 text-[13px] font-semibold tracking-[0.18em] text-[#8a7d6e]",
            "card-footer": "px-6 pb-6 pt-4",
            "card-action":
              "rounded-full bg-[#181613] px-4 py-2 text-[13px] font-medium text-[#fffaf3] transition duration-200 hover:-translate-y-0.5 hover:bg-[#2a2620]",
          }}
        />
        <Card
          id="product-card-hot"
          imgSrc="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80"
          imgAlt="模特展示爆款风衣单品"
          title="爆款推荐｜廓形风衣"
          description="高支棉混纺面料，轻量有型，适合换季叠搭。"
          content="本周加购 TOP 1"
          buttonLabel="加入购物车"
          classNames={{
            card: "row-start-5 row-end-10 col-start-8 col-end-15 sm:max-lg:row-start-7 sm:max-lg:row-end-12 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-12 max-sm:row-end-17 max-sm:col-end-5 overflow-hidden rounded-[24px] border border-[#e6dccf] bg-[#f3ebdf]",
            "card-img": "h-[58%] w-full object-cover",
            "card-header": "space-y-2 px-6 pt-5",
            "card-title": "text-[24px] font-semibold text-[#171512]",
            "card-description": "text-[15px] leading-6 text-[#625b54]",
            "card-content":
              "px-6 pt-5 text-[13px] font-semibold tracking-[0.18em] text-[#8a7d6e]",
            "card-footer": "px-6 pb-6 pt-4",
            "card-action":
              "rounded-full border border-[#d8ccbd] px-4 py-2 text-[13px] font-medium transition duration-200 hover:bg-[#eadfce]",
          }}
        />
        <Card
          id="product-card-new"
          imgSrc="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=80"
          imgAlt="黑色针织新品陈列"
          title="新品上架｜极简针织"
          description="温柔贴身的细针织系列，以黑白灰延展秋季层次。"
          content="今日上新 18 款"
          buttonLabel="立即查看"
          classNames={{
            card: "row-start-5 row-end-10 col-start-15 col-end-23 sm:max-lg:row-start-12 sm:max-lg:row-end-17 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:row-start-17 max-sm:row-end-22 max-sm:col-end-5 overflow-hidden rounded-[24px] border border-[#e6dccf] bg-[#181613]",
            "card-img": "h-[58%] w-full object-cover",
            "card-header": "space-y-2 px-6 pt-5",
            "card-title": "text-[24px] font-semibold text-[#fffaf3]",
            "card-description": "text-[15px] leading-6 text-[#cabfae]",
            "card-content":
              "px-6 pt-5 text-[13px] font-semibold tracking-[0.18em] text-[#b9ab98]",
            "card-footer": "px-6 pb-6 pt-4",
            "card-action":
              "rounded-full bg-[#2a2620] px-4 py-2 text-[13px] font-medium text-[#fffaf3] transition duration-200 hover:bg-[#353128]",
          }}
        />
        <Card
          id="product-card-weekend"
          imgSrc="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80"
          imgAlt="周末休闲穿搭展示"
          title="周末轻行"
          description="针织开衫、牛仔与平底鞋，适合慢节奏外出。"
          content="轻松搭配清单"
          buttonLabel="浏览单品"
          classNames={{
            card: "row-start-10 row-end-15 col-start-1 col-end-6 sm:max-lg:row-start-12 sm:max-lg:row-end-17 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:row-start-22 max-sm:row-end-27 max-sm:col-end-5 overflow-hidden rounded-[24px] border border-[#e6dccf] bg-[#fffdf9]",
            "card-img": "h-[56%] w-full object-cover",
            "card-header": "space-y-2 px-5 pt-4",
            "card-title": "text-[22px] font-semibold",
            "card-description": "text-[14px] leading-6 text-[#625b54]",
            "card-content":
              "px-5 pt-4 text-[13px] font-semibold tracking-[0.14em] text-[#8a7d6e]",
            "card-footer": "px-5 pb-5 pt-4",
            "card-action":
              "rounded-full border border-[#d8ccbd] px-4 py-2 text-[13px] font-medium transition duration-200 hover:bg-[#f5eee4]",
          }}
        />
        <Card
          id="product-card-evening"
          imgSrc="https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=1000&q=80"
          imgAlt="黑色晚装连衣裙展示"
          title="社交晚装"
          description="收腰剪裁与低饱和光泽面料，适配晚宴与派对场景。"
          content="编辑精选套组"
          buttonLabel="选购造型"
          classNames={{
            card: "row-start-10 row-end-15 col-start-6 col-end-12 sm:max-lg:row-start-17 sm:max-lg:row-end-22 sm:max-lg:col-start-1 sm:max-lg:col-end-7 max-sm:hidden overflow-hidden rounded-[24px] border border-[#e6dccf] bg-[#f3ebdf]",
            "card-img": "h-[56%] w-full object-cover",
            "card-header": "space-y-2 px-5 pt-4",
            "card-title": "text-[22px] font-semibold",
            "card-description": "text-[14px] leading-6 text-[#625b54]",
            "card-content":
              "px-5 pt-4 text-[13px] font-semibold tracking-[0.14em] text-[#8a7d6e]",
            "card-footer": "px-5 pb-5 pt-4",
            "card-action":
              "rounded-full border border-[#d8ccbd] px-4 py-2 text-[13px] font-medium transition duration-200 hover:bg-[#eadfce]",
          }}
        />
        <Card
          id="product-card-accessory"
          imgSrc="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80"
          imgAlt="鞋履与配饰商品陈列"
          title="鞋履与配饰"
          description="以低调材质和利落线条完成整体造型的最后一笔。"
          content="精品配搭推荐"
          buttonLabel="前往选购"
          classNames={{
            card: "row-start-10 row-end-15 col-start-12 col-end-23 sm:max-lg:row-start-17 sm:max-lg:row-end-22 sm:max-lg:col-start-7 sm:max-lg:col-end-13 max-sm:hidden overflow-hidden rounded-[24px] border border-[#e6dccf] bg-[#181613]",
            "card-img": "h-[56%] w-full object-cover",
            "card-header": "space-y-2 px-5 pt-4",
            "card-title": "text-[22px] font-semibold text-[#fffaf3]",
            "card-description": "text-[14px] leading-6 text-[#cabfae]",
            "card-content":
              "px-5 pt-4 text-[13px] font-semibold tracking-[0.14em] text-[#b9ab98]",
            "card-footer": "px-5 pb-5 pt-4",
            "card-action":
              "rounded-full bg-[#2a2620] px-4 py-2 text-[13px] font-medium text-[#fffaf3] transition duration-200 hover:bg-[#353128]",
          }}
        />
      </Section>

      <Section
        id="editorial-section"
        columns={22}
        rows={10}
        height={760}
        columnGap={10}
        rowGap={10}
        responsive={{
          tablet: { columns: 12, rows: 12, height: 980 },
          mobile: {
            columns: 4,
            rows: 18,
            height: 1500,
            columnGap: 8,
            rowGap: 8,
          },
        }}
        className="bg-[#f5eee4] px-6 py-6 sm:max-lg:px-5 max-sm:px-3"
      >
        <Text
          id="editorial-kicker"
          content="STYLE JOURNAL"
          className="row-start-1 row-end-2 col-start-1 col-end-6 sm:max-lg:col-end-5 max-sm:col-end-5 text-[12px] font-semibold tracking-[0.26em] text-[#8a7d6e]"
        />
        <Text
          id="editorial-title"
          content="穿搭场景与搭配指南"
          className="row-start-2 row-end-4 col-start-1 col-end-11 sm:max-lg:col-end-8 max-sm:row-start-2 max-sm:row-end-4 max-sm:col-end-5 [font-family:Georgia,serif] text-[46px] leading-[1.05] tracking-[-0.04em] text-[#171512] max-sm:text-[30px]"
        />
        <Card
          id="editorial-scene-card"
          imgSrc="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80"
          imgAlt="模特在城市街景中的秋冬穿搭"
          title="场景灵感｜城市旅途"
          description="从早咖啡到夜间约会，用一件长外套串联全天的温度与气场。"
          content="阅读完整造型故事"
          buttonLabel="进入内容"
          classNames={{
            card: "row-start-4 row-end-11 col-start-1 col-end-12 sm:max-lg:row-start-4 sm:max-lg:row-end-9 sm:max-lg:col-end-13 max-sm:row-start-5 max-sm:row-end-11 max-sm:col-end-5 overflow-hidden rounded-[26px] border border-[#e4d8c7] bg-[#fffdf9]",
            "card-img": "h-[62%] w-full object-cover",
            "card-header": "space-y-2 px-6 pt-5",
            "card-title": "text-[28px] font-semibold text-[#171512]",
            "card-description": "text-[15px] leading-7 text-[#5e564e]",
            "card-content": "px-6 pt-5 text-[14px] font-medium text-[#8a7d6e]",
            "card-footer": "px-6 pb-6 pt-4",
            "card-action":
              "rounded-full bg-[#181613] px-4 py-2 text-[13px] font-medium text-[#fffaf3] transition duration-200 hover:-translate-y-0.5 hover:bg-[#2a2620]",
          }}
        />
        <Card
          id="editorial-guide-card"
          title="搭配指南｜三步完成高级层次"
          description="01 先定主廓形 02 再选材质层次 03 用鞋包收束比例"
          content="以中性色为底，加入一件带结构感的单品，能让整体更显精致。"
          buttonLabel="查看技巧"
          classNames={{
            card: "row-start-4 row-end-8 col-start-12 col-end-23 sm:max-lg:row-start-9 sm:max-lg:row-end-13 sm:max-lg:col-start-1 sm:max-lg:col-end-13 max-sm:row-start-11 max-sm:row-end-16 max-sm:col-end-5 rounded-[26px] border border-[#e4d8c7] bg-[#181613] px-8 py-8 text-[#fffaf3]",
            "card-header": "space-y-3",
            "card-title":
              "[font-family:Georgia,serif] text-[34px] leading-[1.08] tracking-[-0.03em] max-sm:text-[26px]",
            "card-description": "text-[16px] leading-7 text-[#cabfae]",
            "card-content": "pt-10 text-[15px] leading-7 text-[#efe4d4]",
            "card-footer": "pt-6",
            "card-action":
              "rounded-full bg-[#2a2620] px-4 py-2 text-[13px] font-medium transition duration-200 hover:bg-[#353128]",
          }}
        />
        <Image
          id="editorial-detail-image"
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80"
          alt="细节配饰与面料特写"
          className="row-start-8 row-end-11 col-start-12 col-end-23 sm:max-lg:row-start-1 sm:max-lg:row-end-4 sm:max-lg:col-start-8 sm:max-lg:col-end-13 max-sm:row-start-16 max-sm:row-end-19 max-sm:col-end-5 h-full w-full rounded-[26px] object-cover"
        />
      </Section>

      <Section
        id="footer-section"
        columns={22}
        rows={8}
        height={420}
        columnGap={10}
        rowGap={10}
        responsive={{
          tablet: { columns: 12, rows: 10, height: 560 },
          mobile: {
            columns: 4,
            rows: 16,
            height: 900,
            columnGap: 8,
            rowGap: 8,
          },
        }}
        className="bg-[#181613] px-6 py-8 text-[#f7efe3] sm:max-lg:px-5 max-sm:px-3"
      >
        <Text
          id="footer-brand"
          content="LUMIÈRE"
          className="row-start-1 row-end-2 col-start-1 col-end-6 sm:max-lg:col-end-5 max-sm:col-end-5 text-[20px] font-semibold tracking-[0.3em] text-[#fffaf3]"
        />
        <Text
          id="footer-brand-copy"
          content="以现代廓形与温润材质，构建日常高级衣橱。支持 8K 级大片视觉与精品化购物体验。"
          className="row-start-2 row-end-4 col-start-1 col-end-7 sm:max-lg:col-end-6 max-sm:row-start-2 max-sm:row-end-5 max-sm:col-end-5 text-[14px] leading-7 text-[#b8ac99]"
        />
        <Divider
          id="footer-divider"
          orientation="horizontal"
          className="row-start-4 row-end-5 col-start-1 col-end-23 sm:max-lg:col-end-13 max-sm:row-start-5 max-sm:row-end-6 max-sm:col-end-5 border-[#312d27]"
        />
        <Text
          id="footer-service-title"
          content="客服"
          className="row-start-5 row-end-6 col-start-1 col-end-4 sm:max-lg:row-start-5 sm:max-lg:col-end-3 max-sm:row-start-6 max-sm:col-end-3 text-[15px] font-semibold text-[#fffaf3]"
        />
        <Text
          id="footer-service-copy"
          content="在线咨询 09:00-24:00 / 400-820-8899"
          className="row-start-6 row-end-7 col-start-1 col-end-7 sm:max-lg:col-end-5 max-sm:row-start-7 max-sm:row-end-9 max-sm:col-end-5 text-[14px] text-[#a69a89]"
        />
        <Text
          id="footer-after-sales-title"
          content="售后"
          className="row-start-5 row-end-6 col-start-8 col-end-11 sm:max-lg:row-start-5 sm:max-lg:col-start-5 sm:max-lg:col-end-7 max-sm:row-start-9 max-sm:col-end-3 text-[15px] font-semibold text-[#fffaf3]"
        />
        <Text
          id="footer-after-sales-copy"
          content="七天无忧退换 / 尺码顾问 / 门店自提"
          className="row-start-6 row-end-7 col-start-8 col-end-13 sm:max-lg:col-start-5 sm:max-lg:col-end-8 max-sm:row-start-10 max-sm:row-end-12 max-sm:col-end-5 text-[14px] text-[#a69a89]"
        />
        <Text
          id="footer-links-title"
          content="导航"
          className="row-start-5 row-end-6 col-start-14 col-end-17 sm:max-lg:row-start-5 sm:max-lg:col-start-8 sm:max-lg:col-end-10 max-sm:row-start-12 max-sm:col-end-3 text-[15px] font-semibold text-[#fffaf3]"
        />
        <Text
          id="footer-links-copy"
          content="新品上架 / 爆款推荐 / 穿搭指南 / 品牌故事"
          className="row-start-6 row-end-7 col-start-14 col-end-20 sm:max-lg:col-start-8 sm:max-lg:col-end-12 max-sm:row-start-13 max-sm:row-end-15 max-sm:col-end-5 text-[14px] text-[#a69a89]"
        />
        <Text
          id="footer-copyright"
          content="© 2026 LUMIÈRE. All rights reserved."
          className="row-start-8 row-end-9 col-start-1 col-end-8 sm:max-lg:row-start-9 sm:max-lg:col-end-7 max-sm:row-start-16 max-sm:row-end-17 max-sm:col-end-5 text-[12px] tracking-[0.12em] text-[#847868]"
        />
        <Button
          id="footer-cta"
          label="订阅新品提醒"
          type="button"
          className="row-start-5 row-end-7 col-start-19 col-end-23 sm:max-lg:row-start-5 sm:max-lg:row-end-7 sm:max-lg:col-start-10 sm:max-lg:col-end-13 max-sm:row-start-15 max-sm:row-end-16 max-sm:col-end-5 rounded-full bg-[#cb785d] px-5 py-3 text-[14px] font-medium text-[#fffaf3] transition duration-200 hover:-translate-y-0.5 hover:bg-[#b56449]"
        />
      </Section>
    </Root>
  );
}
