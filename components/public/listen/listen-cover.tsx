import Image from "next/image";

import { ArticleCoverImage } from "@/components/public/article-cover-image";

type ListenCoverProps = {
  imageUrl: string | null;
  imageAlt: string | null;
  imageSettings?: unknown;
};

/** Square cover of the listen page: the content photo, or the brand pictogram. */
export function ListenCover({ imageUrl, imageAlt, imageSettings }: ListenCoverProps) {
  if (imageUrl) {
    return (
      <ArticleCoverImage
        src={imageUrl}
        alt={imageAlt}
        settings={imageSettings}
        fill
        forceCover
        sizes="(min-width: 1024px) 384px, 72px"
        preload
        className="size-full"
      />
    );
  }

  return (
    <div className="flex size-full items-center justify-center bg-foreground" aria-hidden>
      <Image
        src="/brand/middleware-pictogram-red.png"
        alt=""
        width={390}
        height={390}
        className="size-1/2 object-contain"
      />
    </div>
  );
}
