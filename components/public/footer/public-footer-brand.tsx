import Image from "next/image";

import { i18n } from "@/lib/i18n";

export function PublicFooterBrand() {
  const text = i18n.public.brand;

  return (
    <div className="col-span-full mb-1 flex items-center gap-3">
      <Image
        src="/brand/middleware-logo-extended-white.png"
        alt={text.title}
        width={221}
        height={33}
        className="h-8.5 w-auto shrink-0 object-contain"
      />
    </div>
  );
}
