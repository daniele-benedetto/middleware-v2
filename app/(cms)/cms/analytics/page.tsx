import { forbidden } from "next/navigation";

import { CmsAnalyticsScreen } from "@/features/cms/telemetry/screens/analytics-screen";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { parseTelemetryAnalyticsSearchParams } from "@/lib/cms/query";
import { prefetchTelemetryAnalytics } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";
import { telemetryPolicy } from "@/lib/server/modules/telemetry";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.analytics,
  description: i18n.cms.lists.analytics.subtitle,
  path: "/cms/analytics",
});

type CmsAnalyticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsAnalyticsPage({ searchParams }: CmsAnalyticsPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await requireCmsSession("/cms/analytics");

  if (!hasAnyCmsRole(session, telemetryPolicy.allowedRoles)) {
    forbidden();
  }

  const input = parseTelemetryAnalyticsSearchParams(resolvedSearchParams);
  const initialData = await prefetchTelemetryAnalytics(input);

  return <CmsAnalyticsScreen initialInput={input} initialData={initialData} />;
}
