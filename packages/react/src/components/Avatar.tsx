import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { twMerge } from "tailwind-merge";

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  id?: string;
  classNames?: {
    avatar?: string;
    "avatar-image"?: string;
    "avatar-fallback"?: string;
  };
}

export function Avatar({ src, alt, fallback, id, classNames }: AvatarProps) {
  return (
    <BaseAvatar.Root
      id={id}
      data-slot="avatar"
      className={twMerge(
        "relative inline-flex shrink-0 overflow-hidden rounded-full",
        classNames?.avatar,
      )}
    >
      {src ? (
        <BaseAvatar.Image
          src={src}
          alt={alt || ""}
          draggable={false}
          data-slot="avatar-image"
          className={twMerge(
            "h-full w-full object-cover",
            classNames?.["avatar-image"],
          )}
        />
      ) : null}
      <BaseAvatar.Fallback
        data-slot="avatar-fallback"
        className={twMerge(
          "flex h-full w-full items-center justify-center",
          classNames?.["avatar-fallback"],
        )}
        aria-label={alt}
      >
        {fallback}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}
