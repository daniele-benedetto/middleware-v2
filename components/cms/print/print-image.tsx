import { resolveCmsMediaPreviewUrl } from "@/lib/media/blob";

import type { PrintImage as PrintImageModel } from "@/lib/print/issue-document";
import type { CSSProperties } from "react";

/* eslint-disable @next/next/no-img-element -- the print document is serialized for the paginator. */

/** Printed photo with the site display settings: black and white, fit, focal point, zoom. */
export function PrintImage({ image }: { image: PrintImageModel }) {
  const { grayscale, fit, positionX, positionY, zoom } = image.settings;
  const style: CSSProperties = {
    objectFit: fit,
    objectPosition: `${positionX}% ${positionY}%`,
    transform: zoom === 100 ? undefined : `scale(${zoom / 100})`,
  };

  return (
    <img
      className={grayscale ? "print-image--grayscale" : undefined}
      src={resolveCmsMediaPreviewUrl(image.url)}
      alt={image.alt}
      style={style}
    />
  );
}
