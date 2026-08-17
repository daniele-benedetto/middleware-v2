import Image from "next/image";

import { editorialImageAlt } from "@/lib/public/format/image";
import { resolvePublicImageSettings } from "@/lib/public/image-settings";
import { cn } from "@/lib/utils";

type ArticleCoverImageProps = {
  src: string;
  alt: string | null;
  settings: unknown;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes: string;
  preload?: boolean;
  className?: string;
  forceCover?: boolean;
};

export function ArticleCoverImage({
  src,
  alt,
  settings,
  width,
  height,
  fill,
  sizes,
  preload,
  className,
  forceCover = false,
}: ArticleCoverImageProps) {
  const imageSettings = resolvePublicImageSettings(settings);

  return (
    <Image
      src={src}
      alt={editorialImageAlt(alt)}
      {...(fill ? { fill: true } : { width: width ?? 1200, height: height ?? 800 })}
      sizes={sizes}
      preload={preload}
      className={cn(imageSettings.grayscale && "grayscale", className)}
      style={{
        objectFit: forceCover ? "cover" : imageSettings.fit,
        objectPosition: `${imageSettings.positionX}% ${imageSettings.positionY}%`,
        transform: imageSettings.zoom === 100 ? undefined : `scale(${imageSettings.zoom / 100})`,
      }}
    />
  );
}
