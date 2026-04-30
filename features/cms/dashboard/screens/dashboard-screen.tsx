import { CmsEditorialCard, CmsMetaText, CmsPageHeader } from "@/components/cms/primitives";
import { toVisibleNavigation } from "@/features/cms/navigation/mappers/to-visible-navigation";
import { i18n } from "@/lib/i18n";

import type { UserRole } from "@/lib/server/auth/roles";

type CmsDashboardScreenProps = {
  role?: UserRole | null;
};

const notInDashboardPage = true;

export function CmsDashboardScreen({ role }: CmsDashboardScreenProps) {
  const text = i18n.cms.dashboard;

  const visibleNavigation = toVisibleNavigation(role, notInDashboardPage);

  return (
    <div className="space-y-7">
      <CmsPageHeader title={text.title} />

      <section className="space-y-3">
        <CmsMetaText variant="category">{text.quickLinksTitle}</CmsMetaText>

        <div className="grid gap-4 grid-cols-(--grid-covers)">
          {visibleNavigation.map((item) => (
            <CmsEditorialCard
              key={item.href}
              href={item.href}
              label={text.section}
              title={item.label}
              ctaLabel={i18n.cms.common.open}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
