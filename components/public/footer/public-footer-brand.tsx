import Image from "next/image";

import { publicTypography } from "@/components/public/primitives";
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
        unoptimized
        className="size-7.75 shrink-0 object-contain"
      />
      <span className={publicTypography.footerBrand}>{text.wordmark}</span>
    </div>
  );
}
