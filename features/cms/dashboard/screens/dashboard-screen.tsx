import {
  CmsBody,
  CmsDisplay,
  CmsEditorialCard,
  CmsMetaText,
  CmsPageHeader,
  CmsSurface,
} from "@/components/cms/primitives";
import { toVisibleNavigation } from "@/features/cms/navigation/mappers/to-visible-navigation";
import { i18n } from "@/lib/i18n";

import type { CmsDashboardMetrics } from "@/features/cms/dashboard/data/get-dashboard-metrics";
import type { UserRole } from "@/lib/server/auth/roles";

type CmsDashboardScreenProps = {
  role?: UserRole | null;
  metrics: CmsDashboardMetrics;
};

const notInDashboardPage = true;

function formatQuickLinkMeta(href: string, metrics: CmsDashboardMetrics) {
  const text = i18n.cms.dashboard.metrics;

  if (href === "/cms/issues") {
    return `${text.issuesActive}: ${metrics.issuesActive} / ${text.issuesTotal}: ${metrics.issuesTotal}`;
  }

  if (href === "/cms/articles") {
    return `${text.articlesDraft}: ${metrics.articlesDraft} / ${text.articlesPublished}: ${metrics.articlesPublished}`;
  }

  if (href === "/cms/categories") {
    return `${text.categoriesTotal}: ${metrics.categoriesTotal}`;
  }

  if (href === "/cms/tags") {
    return `${text.tagsTotal}: ${metrics.tagsTotal}`;
  }

  if (href === "/cms/users") {
    return `${text.usersTotal}: ${metrics.usersTotal}`;
  }

  return undefined;
}

function DashboardMetricCard({ label, value }: { label: string; value: number }) {
  return (
    <CmsSurface spacing="md" className="flex min-h-32 flex-col justify-between">
      <CmsMetaText variant="tiny" as="span">
        {label}
      </CmsMetaText>
      <CmsDisplay as="p" size="h1" className="text-[56px]! leading-[0.9]! tracking-[-0.05em]!">
        {value}
      </CmsDisplay>
    </CmsSurface>
  );
}

function DashboardActivityCard({ title, description }: { title: string; description: string }) {
  return (
    <CmsSurface spacing="lg" className="space-y-3">
      <CmsMetaText variant="category" as="p">
        {title}
      </CmsMetaText>
      <CmsBody size="md" className="max-w-none">
        {description}
      </CmsBody>
    </CmsSurface>
  );
}

export function CmsDashboardScreen({ role, metrics }: CmsDashboardScreenProps) {
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
              meta={formatQuickLinkMeta(item.href, metrics)}
              ctaLabel={i18n.cms.common.open}
              tone={item.href === "/cms/articles" ? "accent" : "default"}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1.5">
          <CmsMetaText variant="category">{text.statusTitle}</CmsMetaText>
          <CmsBody size="sm" tone="muted">
            {text.statusSubtitle}
          </CmsBody>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard label={text.metrics.issuesTotal} value={metrics.issuesTotal} />
          <DashboardMetricCard label={text.metrics.issuesActive} value={metrics.issuesActive} />
          <DashboardMetricCard
            label={text.metrics.issuesPublished}
            value={metrics.issuesPublished}
          />
          <DashboardMetricCard label={text.metrics.articlesTotal} value={metrics.articlesTotal} />
          <DashboardMetricCard label={text.metrics.articlesDraft} value={metrics.articlesDraft} />
          <DashboardMetricCard
            label={text.metrics.articlesPublished}
            value={metrics.articlesPublished}
          />
          <DashboardMetricCard
            label={text.metrics.articlesArchived}
            value={metrics.articlesArchived}
          />
          <DashboardMetricCard
            label={text.metrics.articlesFeatured}
            value={metrics.articlesFeatured}
          />
          <DashboardMetricCard
            label={text.metrics.categoriesTotal}
            value={metrics.categoriesTotal}
          />
          <DashboardMetricCard label={text.metrics.tagsTotal} value={metrics.tagsTotal} />
          {role === "ADMIN" ? (
            <DashboardMetricCard label={text.metrics.usersTotal} value={metrics.usersTotal} />
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1.5">
          <CmsMetaText variant="category">{text.activityTitle}</CmsMetaText>
          <CmsBody size="sm" tone="muted">
            {text.activitySubtitle}
          </CmsBody>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <DashboardActivityCard
            title={text.activity.backlog}
            description={text.activity.backlogDescription(metrics.articlesDraft)}
          />
          <DashboardActivityCard
            title={text.activity.publication}
            description={text.activity.publicationDescription(metrics.articlesPublished)}
          />
          <DashboardActivityCard
            title={text.activity.issues}
            description={text.activity.issuesDescription(metrics.issuesActive, metrics.issuesTotal)}
          />
        </div>
      </section>
    </div>
  );
}
