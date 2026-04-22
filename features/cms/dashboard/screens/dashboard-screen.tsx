import { CmsEditorialCard, CmsPageHeader } from "@/components/cms/primitives";
import { toVisibleNavigation } from "@/features/cms/navigation/mappers/to-visible-navigation";
import { getCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";

export async function CmsDashboardScreen() {
  const session = await getCmsSession();
  const text = i18n.cms.dashboard;

  const visibleNavigation = toVisibleNavigation(session?.user.role);

  return (
    <div className="space-y-6">
      <CmsPageHeader title={text.title} subtitle={text.subtitle} />

      <section className="grid gap-4 grid-cols-(--grid-covers)">
        {visibleNavigation.map((item) => (
          <CmsEditorialCard
            key={item.href}
            href={item.href}
            label={text.section}
            title={item.label}
            ctaLabel="Apri"
          />
        ))}
      </section>
    </div>
  );
}
