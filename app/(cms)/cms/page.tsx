import Link from "next/link";

import { CmsPageHeader } from "@/components/cms/primitives";
import { cmsNavigation } from "@/lib/cms/navigation";

export default function CmsDashboardPage() {
  return (
    <div className="space-y-6">
      <CmsPageHeader title="Dashboard" subtitle="CMS shell and navigation baseline are ready." />

      <section className="grid gap-4 grid-cols-(--grid-covers)">
        {cmsNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="ui-surface border-[3px] border-[#0A0A0A] bg-[#F0E8D8] p-4 transition-colors hover:bg-[#E5D9C5]"
          >
            <p className="font-ui text-[11px] uppercase tracking-[0.08em] text-[#C8001A]">
              Section
            </p>
            <h2 className="font-display mt-2 text-[24px] leading-[0.9] tracking-[-0.03em] text-[#0A0A0A]">
              {item.label}
            </h2>
          </Link>
        ))}
      </section>
    </div>
  );
}
