import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@base-ui/react";
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
import clsx from "clsx";

export interface CarouselProps {
  items?: Array<{
    imgSrc?: string;
    imgAlt?: string;
    title?: string;
    description?: string;
  }>;
  classNames?: {
    root?: string;
    content?: string;
    previous?: string;
    next?: string;
    item?: string;
    "item-img"?: string;
    "item-title"?: string;
    "item-description"?: string;
  };
  orientation?: CarouselRootProps["orientation"];
}

export function Carousel(props: CarouselProps) {
  const { items, classNames, orientation } = props;

  return (
    <CarouselRoot
      orientation={orientation}
      className={classNames?.root}
      data-slot="root"
    >
      <CarouselContent
        className={clsx(
          "flex h-full",
          "data-[orientation=horizontal]:-ml-4",
          "data-[orientation]=vertical]:-ml-4 data-[orientation]=vertical]:flex-col",
          classNames?.content,
        )}
        data-slot="content"
      >
        {items?.map((item, index) => (
          <CarouselItem
            key={index}
            className={clsx(
              "min-w-0 shrink-0 grow-0 basis-full",
              "data-[orientation=horizontal]:pl-4",
              "data-[orientation=vertical]:pt-4",
              classNames?.item,
            )}
            data-slot="item"
          >
            <img
              className={classNames?.["item-img"]}
              src={item.imgSrc}
              alt={item.imgAlt}
              data-slot="item-img"
            />
            {item.title && (
              <div
                data-slot="item-title"
                className={classNames?.["item-title"]}
              >
                {item.title}
              </div>
            )}
            {item.description && (
              <div
                className={classNames?.["item-description"]}
                data-slot="item-description"
              >
                {item.description}
              </div>
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        className={clsx(
          "absolute touch-manipulation rounded-full",
          "data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-3",
          "data-[orientation=vertical]:top-3 data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:rotate-90",
          classNames?.previous,
        )}
        data-slot="previous"
      />
      <CarouselNext
        className={clsx(
          "absolute touch-manipulation rounded-full",
          "data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:right-3",
          "data-[orientation=vertical]:bottom-3 data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:rotate-90",
          classNames?.next,
        )}
        data-slot="next"
      />
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
  className,
  ...rest
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
        {...rest}
        className={clsx("relative", className)}
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
      <div {...props} data-orientation={orientation} />
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
      data-orientation={orientation}
    />
  );
}

type CarouselPreviousProps = Button.Props;

function CarouselPrevious(props: CarouselPreviousProps) {
  const { scrollPrev, orientation, canScrollPrev } = useCarousel();

  return (
    <Button
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
      data-orientation={orientation}
    >
      <ChevronLeftIcon />
    </Button>
  );
}

type CarouselNextProps = Button.Props;

function CarouselNext(props: CarouselNextProps) {
  const { scrollNext, orientation, canScrollNext } = useCarousel();

  return (
    <Button
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
      data-orientation={orientation}
    >
      <ChevronRightIcon />
    </Button>
  );
}
