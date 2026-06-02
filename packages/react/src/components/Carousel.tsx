import useEmblaCarousel from "embla-carousel-react";
import { Button, type ButtonProps } from "./Button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UseEmblaCarouselType } from "embla-carousel-react";
import type { ComponentProps, KeyboardEvent } from "react";

export interface CarouselProps extends CarouselRootProps {
  items?: Array<{
    imgSrc?: string;
    imgAlt?: string;
    title?: string;
    description?: string;
  }>;
  slots?: {
    content?: CarouselContentProps;
    previous?: CarouselPreviousProps;
    next?: CarouselNextProps;
    item?: CarouselItemProps;
    "item-img"?: ComponentProps<"img">;
    "item-title"?: ComponentProps<"div">;
    "item-description"?: ComponentProps<"div">;
  };
}

export function Carousel(props: CarouselProps) {
  const { items, slots, ...rest } = props;

  return (
    <CarouselRoot {...rest} data-slot="root">
      <CarouselContent {...slots?.["content"]}>
        {items?.map((item, index) => (
          <CarouselItem key={index} {...slots?.["item"]}>
            <img
              {...slots?.["item-img"]}
              src={item.imgSrc}
              alt={item.imgAlt}
              data-slot="item-img"
            />
            {item.title && (
              <div {...slots?.["item-title"]} data-slot="item-title">
                {item.title}
              </div>
            )}
            {item.description && (
              <div
                {...slots?.["item-description"]}
                data-slot="item-description"
              >
                {item.description}
              </div>
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious {...slots?.["previous"]} />
      <CarouselNext {...slots?.["next"]} />
    </CarouselRoot>
  );
}

type CarouselApi = UseEmblaCarouselType[1];

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & Pick<CarouselRootProps, "orientation">;

const CarouselContext = createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

interface CarouselRootProps extends ComponentProps<"div"> {
  orientation?: "horizontal" | "vertical";
}

function CarouselRoot({
  orientation = "horizontal",
  children,
  ...props
}: CarouselRootProps) {
  const [carouselRef, api] = useEmblaCarousel({
    axis: orientation === "horizontal" ? "x" : "y",
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  const scrollPrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext],
  );

  useEffect(() => {
    if (!api) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api?.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        orientation,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        role="region"
        aria-roledescription="carousel"
        {...props}
        data-slot="root"
        data-orientation={orientation}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

type CarouselContentProps = ComponentProps<"div">;
function CarouselContent(props: CarouselContentProps) {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div ref={carouselRef} className="h-full overflow-hidden">
      <div {...props} data-slot="content" data-orientation={orientation} />
    </div>
  );
}

type CarouselItemProps = ComponentProps<"div">;
function CarouselItem(props: CarouselItemProps) {
  const { orientation } = useCarousel();
  return (
    <div
      role="group"
      aria-roledescription="slide"
      {...props}
      data-slot="item"
      data-orientation={orientation}
    />
  );
}

type CarouselPreviousProps = ButtonProps;

function CarouselPrevious(props: CarouselPreviousProps) {
  const { scrollPrev, orientation, canScrollPrev } = useCarousel();

  return (
    <Button
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
      data-slot="previous"
      data-orientation={orientation}
    >
      <ChevronLeftIcon />
    </Button>
  );
}

type CarouselNextProps = ButtonProps;

function CarouselNext(props: CarouselNextProps) {
  const { scrollNext, orientation, canScrollNext } = useCarousel();

  return (
    <Button
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
      data-slot="next"
      data-orientation={orientation}
    >
      <ChevronRightIcon />
    </Button>
  );
}
