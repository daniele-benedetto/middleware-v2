import { CmsEyebrow } from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";

export function CmsPaginationFooter() {
  const text = i18n.cms.pagination;

  return (
    <div className="flex items-center justify-between gap-3">
      <CmsEyebrow>{text.page}</CmsEyebrow>
      <CmsEyebrow>{text.perPage}</CmsEyebrow>
    </div>
  );
}
