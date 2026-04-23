import {
  CmsBody,
  CmsDisplay,
  CmsEditorialCard,
  CmsMetaText,
  CmsPageHeader,
  CmsSurface,
} from "@/components/cms/primitives";
import { getCmsDashboardMetrics } from "@/features/cms/dashboard/data/get-dashboard-metrics";
import { toVisibleNavigation } from "@/features/cms/navigation/mappers/to-visible-navigation";
import { getCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";

export async function CmsDashboardScreen() {
  const session = await getCmsSession();
  const text = i18n.cms.dashboard;
  const metrics = await getCmsDashboardMetrics();

  const visibleNavigation = toVisibleNavigation(session?.user.role);

  const editorialMetrics = [
    { label: text.metrics.issuesTotal, value: metrics.issuesTotal },
    { label: text.metrics.issuesActive, value: metrics.issuesActive },
    { label: text.metrics.issuesPublished, value: metrics.issuesPublished },
    { label: text.metrics.categoriesTotal, value: metrics.categoriesTotal },
    { label: text.metrics.tagsTotal, value: metrics.tagsTotal },
    { label: text.metrics.articlesTotal, value: metrics.articlesTotal },
    { label: text.metrics.articlesDraft, value: metrics.articlesDraft },
    { label: text.metrics.articlesPublished, value: metrics.articlesPublished },
    { label: text.metrics.articlesArchived, value: metrics.articlesArchived },
    { label: text.metrics.articlesFeatured, value: metrics.articlesFeatured },
  ];

  const placeholderActivity = [
    {
      title: text.activity.backlog,
      description: text.activity.backlogDescription(metrics.articlesDraft),
    },
    {
      title: text.activity.publication,
      description: text.activity.publicationDescription(metrics.articlesPublished),
    },
    {
      title: text.activity.issues,
      description: text.activity.issuesDescription(metrics.issuesActive, metrics.issuesTotal),
    },
  ];

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
              ctaLabel="Apri"
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <CmsSurface border="default" spacing="lg" className="space-y-4 lg:col-span-2">
          <div className="space-y-1">
            <CmsMetaText variant="category">{text.statusTitle}</CmsMetaText>
            <CmsBody size="sm" tone="muted">
              {text.statusSubtitle}
            </CmsBody>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {editorialMetrics.map((item) => (
              <div key={item.label} className="border border-foreground px-3 py-2">
                <CmsMetaText variant="tiny" className="block">
                  {item.label}
                </CmsMetaText>
                <CmsDisplay as="p" size="label" className="mt-2">
                  {String(item.value)}
                </CmsDisplay>
              </div>
            ))}
          </div>
        </CmsSurface>

        <CmsSurface border="default" spacing="lg" className="space-y-4">
          <div className="space-y-1">
            <CmsMetaText variant="category">{text.activityTitle}</CmsMetaText>
            <CmsBody size="sm" tone="muted">
              {text.activitySubtitle}
            </CmsBody>
          </div>

          <CmsMetaText
            variant="tiny"
            className="inline-block border border-accent px-2 py-1 text-accent"
          >
            {text.badgeAuditPlaceholder}
          </CmsMetaText>

          <div className="space-y-2">
            {placeholderActivity.map((item) => (
              <article key={item.title} className="border border-foreground px-3 py-2">
                <CmsMetaText variant="tagline" className="block">
                  {item.title}
                </CmsMetaText>
                <CmsBody size="sm" tone="muted" className="mt-1">
                  {item.description}
                </CmsBody>
              </article>
            ))}
          </div>
        </CmsSurface>
      </section>
    </div>
  );
}
