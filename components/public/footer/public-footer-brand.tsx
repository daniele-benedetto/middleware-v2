import Image from "next/image";

import { i18n } from "@/lib/i18n";

export function PublicFooterBrand() {
  const text = i18n.public.brand;

  return (
    <div className="col-span-full mb-1 flex items-center gap-3">
      <Image
        src="/brand/middleware-logo.svg"
        alt={text.logoAlt}
        width={31}
        height={31}
        className="size-7.75 shrink-0 object-contain"
      />
      <span className="font-heading text-xl leading-none font-extrabold tracking-[-0.02em] lowercase">
        {text.wordmark}
      </span>
    </div>
  );
}
