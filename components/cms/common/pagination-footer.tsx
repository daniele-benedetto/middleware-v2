import { i18n } from "@/lib/i18n";

export function CmsPaginationFooter() {
  const text = i18n.cms.pagination;

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="font-ui text-[11px] uppercase tracking-[0.08em] text-[rgba(10,10,10,0.6)]">
        {text.page}
      </p>
      <p className="font-ui text-[11px] uppercase tracking-[0.08em] text-[rgba(10,10,10,0.6)]">
        {text.perPage}
      </p>
    </div>
  );
}
