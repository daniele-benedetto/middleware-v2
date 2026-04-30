"use client";

import Image from "next/image";
import { useState } from "react";

import { buildCmsMediaAssetUrl } from "@/lib/media/blob";

const mediaBlurDataUrl =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNDAwJyBoZWlnaHQ9JzMwMCcgdmlld0JveD0nMCAwIDQwMCAzMDAnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PHJlY3Qgd2lkdGg9JzQwMCcgaGVpZ2h0PSczMDAnIGZpbGw9JyNlZWU5ZGQnLz48L3N2Zz4=";

type CmsMediaImageProps = {
  pathname: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

export function CmsMediaImage({
  pathname,
  alt,
  sizes,
  priority = false,
  className,
}: CmsMediaImageProps) {
  const [currentSrc, setCurrentSrc] = useState(buildCmsMediaAssetUrl(pathname));

  return (
    <Image
      fill
      src={currentSrc}
      alt={alt}
      sizes={sizes}
      priority={priority}
      unoptimized
      placeholder="blur"
      blurDataURL={mediaBlurDataUrl}
      className={className}
      onError={() => {
        if (currentSrc !== "/brand/icon1.png") {
          setCurrentSrc("/brand/icon1.png");
        }
      }}
    />
  );
}
