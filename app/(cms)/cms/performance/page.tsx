import { forbidden } from "next/navigation";

import { CmsPerformanceScreen } from "@/features/cms/telemetry/screens/performance-screen";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { parseTelemetryPerformanceSearchParams } from "@/lib/cms/query";
import { prefetchTelemetryPerformance } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";
import { telemetryPolicy } from "@/lib/server/modules/telemetry";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.performance,
  description: i18n.cms.lists.performance.subtitle,
  path: "/cms/performance",
});

type CmsPerformancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsPerformancePage({ searchParams }: CmsPerformancePageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await requireCmsSession("/cms/performance");

  if (!hasAnyCmsRole(session, telemetryPolicy.allowedRoles)) {
    forbidden();
  }

  const input = parseTelemetryPerformanceSearchParams(resolvedSearchParams);
  const initialData = await prefetchTelemetryPerformance(input);

  return <CmsPerformanceScreen initialInput={input} initialData={initialData} />;
}
