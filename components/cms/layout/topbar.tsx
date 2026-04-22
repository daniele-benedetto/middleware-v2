import { CmsEyebrow, CmsMetaRow } from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";

import type { UserRole } from "@/lib/server/auth/roles";

type CmsTopbarProps = {
  role: UserRole;
};

export function CmsTopbar({ role }: CmsTopbarProps) {
  const text = i18n.cms.topbar;
  const roleLabel = role === "ADMIN" ? text.roleAdmin : text.roleEditor;

  return (
    <div className="flex items-center justify-between gap-4 bg-background px-5 py-3">
      <CmsEyebrow>{text.label}</CmsEyebrow>
      <CmsMetaRow label={text.rolePrefix} value={roleLabel} />
    </div>
  );
}
