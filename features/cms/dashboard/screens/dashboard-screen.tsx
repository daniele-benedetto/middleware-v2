import { CmsEditorialCard, CmsMetaText, CmsPageHeader } from "@/components/cms/primitives";
import { toVisibleNavigation } from "@/features/cms/navigation/mappers/to-visible-navigation";
import { getCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";

export async function CmsDashboardScreen() {
  const session = await getCmsSession();
  const text = i18n.cms.dashboard;

  const visibleNavigation = toVisibleNavigation(session?.user.role);

  return (
    <div className="space-y-7">
      <CmsPageHeader title={text.title} subtitle={text.subtitle} />

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
