import { forbidden } from "next/navigation";

import { CmsErrorsScreen } from "@/features/cms/telemetry/screens/errors-screen";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { parseTelemetryErrorsListSearchParams } from "@/lib/cms/query";
import { prefetchTelemetryErrorsList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";
import { telemetryPolicy } from "@/lib/server/modules/telemetry";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.errors,
  description: i18n.cms.lists.errors.subtitle,
  path: "/cms/errors",
});

type CmsErrorsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsErrorsPage({ searchParams }: CmsErrorsPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await requireCmsSession("/cms/errors");

  if (!hasAnyCmsRole(session, telemetryPolicy.allowedRoles)) {
    forbidden();
  }

  const input = parseTelemetryErrorsListSearchParams(resolvedSearchParams);
  const initialData = await prefetchTelemetryErrorsList(input);

  return <CmsErrorsScreen initialInput={input} initialData={initialData} />;
}
