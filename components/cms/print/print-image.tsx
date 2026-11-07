import { resolveCmsMediaPreviewUrl } from "@/lib/media/blob";

import type { PrintImage as PrintImageModel } from "@/lib/print/issue-document";

/* eslint-disable @next/next/no-img-element -- the print document is serialized for the paginator. */

/** Printed photo: black and white only when its settings ask for it. */
export function PrintImage({ image }: { image: PrintImageModel }) {
  return (
    <img
      className={image.grayscale ? "print-image--grayscale" : undefined}
      src={resolveCmsMediaPreviewUrl(image.url)}
      alt={image.alt}
    />
  );
}
