import {
  Root,
  Section,
  Navbar,
  Carousel,
  Card,
  Text,
  Button,
  Divider,
  Social,
} from "@/components";
import "./fashion-ecommerce-home.css";

const heroImages = [
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2400&q=90",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=2400&q=90",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=2400&q=90",
];

export default function App() {
  return (
    <Root className="min-h-screen bg-[#f5f1eb] text-[#211f1b] antialiased">
      <Section
        className="sticky top-0 z-50 h-[72px] bg-[#f5f1eb]/90 backdrop-blur-xl border-b border-[#211f1b]/10"
        columns={12}
        rows={1}
        columnGap={0}
        rowGap={0}
      >
        <Navbar
          brand="MAISON LIN"
          sticky={false}
          items={[
            { label: "女士", href: "#products", active: true },
            { label: "男士", href: "#products" },
            { label: "新品", href: "#new" },
            { label: "穿搭指南", href: "#guide" },
            { label: "品牌故事", href: "#footer" },
          ]}
          secondaryAction={{ label: "搜索", href: "#products" }}
          primaryAction={{ label: "购物车 / 我的", href: "#footer" }}
          classNames={{
            navbar:
              "row-start-1 row-end-2 col-start-1 col-end-13 h-full bg-transparent shadow-none",
            "navbar-inner": "h-full px-3 sm:px-5 md:px-10 lg:px-14",
            "navbar-brand":
              "font-serif text-xs tracking-[0.16em] text-[#211f1b] sm:text-lg sm:tracking-[0.22em] md:text-xl md:tracking-[0.28em]",
            "navbar-nav-list": "!hidden lg:!flex justify-center gap-5",
            "navbar-nav-item":
              "rounded-none px-1 py-2 text-[13px] tracking-[0.18em] text-[#6d665d] hover:bg-transparent hover:text-[#211f1b]",
            "navbar-active-nav-item":
              "bg-transparent text-[#211f1b] border-b border-[#211f1b]",
            "navbar-actions": "gap-3",
            "navbar-secondary-action":
              "hidden sm:block rounded-none px-2 text-[12px] tracking-[0.18em] text-[#6d665d] hover:bg-transparent hover:text-[#211f1b]",
            "navbar-primary-action":
              "rounded-full bg-[#211f1b] px-3 py-2 text-[11px] tracking-[0.12em] text-[#f8f4ee] hover:bg-[#4a4037] sm:px-5 sm:text-[12px]",
            "navbar-mobile-panel": "bg-[#f5f1eb] border-[#211f1b]/10",
            "navbar-mobile-toggle": "border-[#211f1b]/20 text-[#211f1b]",
          }}
        />
      </Section>

      <Section
        className="h-[calc(100vh-72px)] px-4 py-4 md:px-8 md:py-8"
        columns={12}
        rows={12}
        columnGap={16}
        rowGap={16}
      >
        <Carousel
          orientation="horizontal"
          items={heroImages.map((imgSrc, index) => ({
            imgSrc,
            imgAlt: `模特演绎低饱和高级通勤穿搭 ${index + 1}`,
            title:
              index === 0
                ? "秋冬静奢新装"
                : index === 1
                  ? "羊毛、皮革与柔光廓形"
                  : "都市周末胶囊衣橱",
            description:
              index === 0
                ? "精选外套与针织，满 ¥1,200 享 9 折"
                : index === 1
                  ? "以低饱和色阶完成全天候搭配"
                  : "新品上架，限时会员双倍积分",
          }))}
          classNames={{
            carousel:
              "row-start-1 row-end-13 col-start-1 col-end-13 relative overflow-hidden bg-[#ded7ca] shadow-[0_28px_80px_rgba(33,31,27,0.14)]",
            "carousel-content": "h-full",
            "carousel-item": "relative h-full pl-0",
            "carousel-item-img":
              "h-full w-full object-cover object-center brightness-[0.78] saturate-[0.72]",
            "carousel-item-title":
              "absolute left-6 bottom-28 max-w-[820px] font-serif text-5xl leading-[0.96] tracking-[-0.04em] text-[#fbf8f1] md:left-12 md:text-7xl lg:left-20 lg:text-8xl",
            "carousel-item-description":
              "absolute left-6 bottom-16 max-w-[560px] text-sm leading-7 tracking-[0.18em] text-[#fbf8f1]/90 md:left-12 lg:left-20",
            "carousel-previous":
              "left-5 h-11 w-11 border border-[#fbf8f1]/50 bg-[#211f1b]/20 text-[#fbf8f1] backdrop-blur-md hover:bg-[#211f1b]/40",
            "carousel-next":
              "right-5 h-11 w-11 border border-[#fbf8f1]/50 bg-[#211f1b]/20 text-[#fbf8f1] backdrop-blur-md hover:bg-[#211f1b]/40",
          }}
        />
        <Text
          content="2025 WINTER EDIT"
          className="row-start-2 row-end-3 col-start-2 col-end-7 z-10 text-xs tracking-[0.34em] text-[#fbf8f1]/80"
        />
        <Button
          label="立即选购"
          type="button"
          className="row-start-10 row-end-11 col-start-2 col-end-5 z-10 rounded-full border border-[#fbf8f1] bg-[#fbf8f1] px-8 py-4 text-xs font-medium tracking-[0.22em] text-[#211f1b] hover:bg-transparent hover:text-[#fbf8f1] md:col-end-4"
        />
      </Section>

      <Section
        className="px-4 py-8 md:px-8 lg:px-14"
        columns={12}
        rows={4}
        columnGap={16}
        rowGap={16}
      >
        <Text
          content="会员专享福利"
          className="row-start-1 row-end-2 col-start-1 col-end-13 text-center text-xs tracking-[0.34em] text-[#8a7f72]"
        />
        <Card
          title="换季礼遇"
          description="全场精选满 ¥899 减 ¥120；外套与靴履组合再享会员积分。"
          buttonLabel="查看活动"
          classNames={{
            card: "row-start-2 row-end-5 col-start-1 col-end-13 bg-[#211f1b] px-7 py-8 text-[#f8f4ee] md:px-12 lg:px-16",
            "card-header": "max-w-4xl",
            "card-title": "font-serif text-4xl tracking-[-0.03em] md:text-6xl",
            "card-description":
              "mt-4 max-w-2xl text-sm leading-7 tracking-[0.12em] text-[#d7cfc4]",
            "card-footer": "mt-7",
            "card-action":
              "rounded-full border border-[#f8f4ee]/50 px-7 py-3 text-xs tracking-[0.2em] text-[#f8f4ee] hover:bg-[#f8f4ee] hover:text-[#211f1b]",
          }}
        />
      </Section>

      <Section
        id="products"
        className="px-4 py-12 md:px-8 lg:px-14"
        columns={12}
        rows={11}
        columnGap={16}
        rowGap={16}
      >
        <Text
          content="分类穿搭"
          className="row-start-1 row-end-2 col-start-1 col-end-5 font-serif text-4xl tracking-[-0.03em] md:text-5xl"
        />
        <Text
          content="以通勤、周末、晚间三个场景组织衣橱，减少选择成本。"
          className="row-start-1 row-end-2 col-start-6 col-end-13 self-end text-sm leading-7 tracking-[0.08em] text-[#6d665d]"
        />
        <Card
          imgSrc="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85"
          imgAlt="通勤大衣穿搭"
          title="通勤套装"
          description="羊毛大衣 / 烟灰西裤"
          buttonLabel="进入分类"
          classNames={{
            card: "row-start-3 row-end-7 col-start-1 col-end-13 bg-[#ebe5dc] md:row-end-10 md:col-end-5",
            "card-img":
              "h-[220px] w-full object-cover saturate-[0.75] md:h-[360px]",
            "card-header": "p-5",
            "card-title": "font-serif text-2xl",
            "card-description": "mt-2 text-sm tracking-[0.12em] text-[#7b7166]",
            "card-footer": "px-5 pb-5",
            "card-action":
              "rounded-full border border-[#211f1b]/20 px-5 py-2 text-xs tracking-[0.16em]",
          }}
        />
        <Card
          imgSrc="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85"
          imgAlt="周末休闲穿搭"
          title="周末层次"
          description="皮革夹克 / 棉质衬衫"
          buttonLabel="进入分类"
          classNames={{
            card: "row-start-7 row-end-11 col-start-1 col-end-7 bg-[#ebe5dc] md:row-start-3 md:row-end-10 md:col-start-5 md:col-end-9",
            "card-img":
              "h-[220px] w-full object-cover saturate-[0.75] md:h-[360px]",
            "card-header": "p-5",
            "card-title": "font-serif text-2xl",
            "card-description": "mt-2 text-sm tracking-[0.12em] text-[#7b7166]",
            "card-footer": "px-5 pb-5",
            "card-action":
              "rounded-full border border-[#211f1b]/20 px-5 py-2 text-xs tracking-[0.16em]",
          }}
        />
        <Card
          imgSrc="https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=85"
          imgAlt="晚间礼服穿搭"
          title="晚间廓形"
          description="丝缎裙装 / 细节配饰"
          buttonLabel="进入分类"
          classNames={{
            card: "row-start-7 row-end-11 col-start-7 col-end-13 bg-[#ebe5dc] md:row-start-3 md:row-end-10 md:col-start-9 md:col-end-13",
            "card-img":
              "h-[220px] w-full object-cover saturate-[0.75] md:h-[360px]",
            "card-header": "p-5",
            "card-title": "font-serif text-2xl",
            "card-description": "mt-2 text-sm tracking-[0.12em] text-[#7b7166]",
            "card-footer": "px-5 pb-5",
            "card-action":
              "rounded-full border border-[#211f1b]/20 px-5 py-2 text-xs tracking-[0.16em]",
          }}
        />
      </Section>

      <Section
        id="new"
        className="bg-[#e5ded2] px-4 py-12 md:px-8 lg:px-14"
        columns={12}
        rows={12}
        columnGap={16}
        rowGap={16}
      >
        <Text
          content="爆款推荐 / 新品上架"
          className="row-start-1 row-end-2 col-start-1 col-end-13 text-center font-serif text-4xl tracking-[-0.03em] md:text-5xl"
        />
        {[
          [
            "https://images.unsplash.com/photo-1548624313-0396c75e4b1a?auto=format&fit=crop&w=900&q=85",
            "双面羊毛短外套",
            "¥1,690",
            "row-start-3 row-end-5 col-start-1 col-end-7 md:row-end-7 md:col-end-4",
          ],
          [
            "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=85",
            "垂坠醋酸连衣裙",
            "¥980",
            "row-start-3 row-end-5 col-start-7 col-end-13 md:row-end-7 md:col-start-4 md:col-end-7",
          ],
          [
            "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=85",
            "细罗纹羊绒针织",
            "¥760",
            "row-start-5 row-end-7 col-start-1 col-end-7 md:row-start-3 md:col-start-7 md:col-end-10",
          ],
          [
            "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=85",
            "高腰阔腿长裤",
            "¥620",
            "row-start-5 row-end-7 col-start-7 col-end-13 md:row-start-3 md:col-start-10 md:col-end-13",
          ],
          [
            "https://images.unsplash.com/photo-1551803091-e20673f15770?auto=format&fit=crop&w=900&q=85",
            "廓形风衣",
            "¥1,480",
            "row-start-8 row-end-10 col-start-1 col-end-7 md:row-end-12 md:col-end-4",
          ],
          [
            "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85",
            "真丝基础衬衫",
            "¥590",
            "row-start-8 row-end-10 col-start-7 col-end-13 md:row-end-12 md:col-start-4 md:col-end-7",
          ],
          [
            "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=900&q=85",
            "皮革托特包",
            "¥1,280",
            "row-start-10 row-end-12 col-start-1 col-end-7 md:row-start-8 md:col-start-7 md:col-end-10",
          ],
          [
            "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=85",
            "方头短靴",
            "¥890",
            "row-start-10 row-end-12 col-start-7 col-end-13 md:row-start-8 md:col-start-10 md:col-end-13",
          ],
        ].map(([imgSrc, title, price, place]) => (
          <Card
            key={title}
            imgSrc={imgSrc}
            imgAlt={title}
            title={title}
            description={price}
            buttonLabel="加入购物车"
            classNames={{
              card: `${place} bg-[#f7f2eb]`,
              "card-img":
                "h-[170px] w-full object-cover saturate-[0.72] md:h-[230px]",
              "card-header": "px-4 pt-4",
              "card-title": "text-base font-medium tracking-[0.06em]",
              "card-description": "mt-2 text-sm text-[#7b7166]",
              "card-footer": "px-4 pb-4 pt-3",
              "card-action":
                "w-full rounded-full bg-[#211f1b] px-4 py-2 text-xs tracking-[0.16em] text-[#f8f4ee] hover:bg-[#4a4037]",
            }}
          />
        ))}
      </Section>

      <Section
        id="guide"
        className="px-4 py-14 md:px-8 lg:px-14"
        columns={12}
        rows={8}
        columnGap={16}
        rowGap={16}
      >
        <Card
          imgSrc="https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1600&q=85"
          imgAlt="模特展示低饱和层次穿搭"
          title="场景搭配指南"
          description="从晨间会议到夜间聚会，用三件核心单品完成一日衣橱。"
          buttonLabel="阅读指南"
          classNames={{
            card: "row-start-1 row-end-9 col-start-1 col-end-8 bg-[#ebe5dc]",
            "card-img": "h-[520px] w-full object-cover saturate-[0.72]",
            "card-header": "p-7",
            "card-title": "font-serif text-4xl md:text-5xl",
            "card-description":
              "mt-4 max-w-xl text-sm leading-7 tracking-[0.08em] text-[#6d665d]",
            "card-footer": "px-7 pb-7",
            "card-action":
              "rounded-full border border-[#211f1b]/25 px-6 py-3 text-xs tracking-[0.18em]",
          }}
        />
        <Text
          content="01 选择同色系外套与内搭，保留材质差异。"
          className="row-start-2 row-end-3 col-start-9 col-end-13 text-lg leading-8 tracking-[0.06em]"
        />
        <Divider
          orientation="horizontal"
          className="row-start-3 row-end-4 col-start-9 col-end-13 border-[#211f1b]/20"
        />
        <Text
          content="02 用皮革、羊毛、丝缎构成低调但清晰的层次。"
          className="row-start-4 row-end-5 col-start-9 col-end-13 text-lg leading-8 tracking-[0.06em]"
        />
        <Divider
          orientation="horizontal"
          className="row-start-5 row-end-6 col-start-9 col-end-13 border-[#211f1b]/20"
        />
        <Text
          content="03 配饰只保留一个视觉重点，避免破坏整体留白。"
          className="row-start-6 row-end-7 col-start-9 col-end-13 text-lg leading-8 tracking-[0.06em]"
        />
      </Section>

      <Section
        id="footer"
        className="bg-[#211f1b] px-4 py-12 text-[#f8f4ee] md:px-8 lg:px-14"
        columns={12}
        rows={6}
        columnGap={16}
        rowGap={16}
      >
        <Text
          content="MAISON LIN"
          className="row-start-1 row-end-2 col-start-1 col-end-5 font-serif text-3xl tracking-[0.22em]"
        />
        <Text
          content="低饱和高级成衣与日常衣橱方案。我们提供 7 日无理由退换、门店修改与会员专属搭配咨询。"
          className="row-start-2 row-end-5 col-start-1 col-end-5 text-sm leading-7 tracking-[0.08em] text-[#d7cfc4]"
        />
        <Text
          content="客服：400-820-2025\n周一至周日 10:00-22:00"
          className="row-start-1 row-end-3 col-start-6 col-end-9 whitespace-pre-line text-sm leading-7 tracking-[0.08em] text-[#d7cfc4]"
        />
        <Text
          content="售后服务\n退换政策 / 物流查询 / 尺码建议 / 门店预约"
          className="row-start-3 row-end-5 col-start-6 col-end-9 whitespace-pre-line text-sm leading-7 tracking-[0.08em] text-[#d7cfc4]"
        />
        <Text
          content="导航\n新品上架 / 爆款推荐 / 穿搭指南 / 品牌故事"
          className="row-start-1 row-end-4 col-start-10 col-end-13 whitespace-pre-line text-sm leading-7 tracking-[0.08em] text-[#d7cfc4]"
        />
        <Social
          items={[
            { icon: "instagram", href: "#" },
            { icon: "x", href: "#" },
            { icon: "facebook", href: "#" },
          ]}
          classNames={{
            social: "row-start-5 row-end-6 col-start-10 col-end-13 flex gap-4",
            "social-item": "text-[#f8f4ee]/80 hover:text-[#f8f4ee]",
          }}
        />
      </Section>
    </Root>
  );
}
