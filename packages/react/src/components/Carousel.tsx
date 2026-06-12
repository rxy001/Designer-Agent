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
import { twMerge } from "tailwind-merge";

export interface CarouselProps {
  items?: Array<{
    imgSrc?: string;
    imgAlt?: string;
    title?: string;
    description?: string;
  }>;
  classNames?: {
    carousel?: string;
    "carousel-content"?: string;
    "carousel-previous"?: string;
    "carousel-next"?: string;
    "carousel-item"?: string;
    "carousel-item-img"?: string;
    "carousel-item-title"?: string;
    "carousel-item-description"?: string;
  };
  orientation?: CarouselRootProps["orientation"];
}

export function Carousel(props: CarouselProps) {
  const { items, classNames, orientation } = props;

  return (
    <CarouselRoot
      orientation={orientation}
      className={twMerge("relative", classNames?.carousel)}
      data-slot="carousel"
    >
      <CarouselContent
        className={twMerge(
          "flex h-full",
          "data-[orientation=horizontal]:-ml-4",
          "data-[orientation=vertical]:-ml-4 data-[orientation=vertical]:flex-col",
          classNames?.["carousel-content"],
        )}
        data-slot="carousel-content"
      >
        {items?.map((item, index) => (
          <CarouselItem
            key={index}
            className={twMerge(
              "min-w-0 shrink-0 grow-0 basis-full",
              "data-[orientation=horizontal]:pl-4",
              "data-[orientation=vertical]:pt-4",
              classNames?.["carousel-item"],
            )}
            data-slot="carousel-item"
          >
            <img
              className={classNames?.["carousel-item-img"]}
              src={item.imgSrc}
              alt={item.imgAlt}
              data-slot="carousel-item-img"
            />
            {item.title && (
              <div
                data-slot="carousel-item-title"
                className={classNames?.["carousel-item-title"]}
              >
                {item.title}
              </div>
            )}
            {item.description && (
              <div
                className={classNames?.["carousel-item-description"]}
                data-slot="carousel-item-description"
              >
                {item.description}
              </div>
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        className={twMerge(
          "absolute touch-manipulation rounded-full inline-flex justify-center items-center",
          "data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:left-3",
          "data-[orientation=vertical]:top-3 data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:rotate-90",
          classNames?.["carousel-previous"],
        )}
        data-slot="carousel-previous"
      />
      <CarouselNext
        className={twMerge(
          "absolute touch-manipulation rounded-full inline-flex justify-center items-center",
          "data-[orientation=horizontal]:top-1/2 data-[orientation=horizontal]:right-3",
          "data-[orientation=vertical]:bottom-3 data-[orientation=vertical]:left-1/2 data-[orientation=vertical]:rotate-90",
          classNames?.["carousel-next"],
        )}
        data-slot="carousel-next"
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
