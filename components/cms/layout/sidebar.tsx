import Link from "next/link";

import { cmsNavigation } from "@/lib/cms/navigation";
import { i18n } from "@/lib/i18n";

export function CmsSidebar() {
  const text = i18n.cms.navigation;

  return (
    <div className="h-full bg-[#F0E8D8] p-5">
      <p className="font-ui text-[11px] uppercase tracking-[0.08em] text-[#C8001A]">{text.brand}</p>
      <h2 className="font-display mt-2 text-[24px] leading-[0.9] tracking-[-0.03em] text-[#0A0A0A]">
        {text.app}
      </h2>
      <nav className="mt-6 space-y-2">
        {cmsNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block border border-[#0A0A0A] bg-[#F0E8D8] px-3 py-2 font-ui text-[11px] uppercase tracking-[0.08em] text-[#0A0A0A] transition-colors hover:bg-[#E5D9C5]"
          >
            {item.label}
            {item.adminOnly ? ` ${text.adminSuffix}` : ""}
          </Link>
        ))}
      </nav>
    </div>
  );
}
