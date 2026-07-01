import { forbidden } from "next/navigation";

import { CmsErrorsScreen } from "@/features/cms/observability-errors/screens/errors-inbox-screen";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { parseObservabilityErrorsListSearchParams } from "@/lib/cms/query";
import { prefetchObservabilityErrorsList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";
import { observabilityErrorsPolicy } from "@/lib/server/modules/observability-errors";

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

  if (!hasAnyCmsRole(session, observabilityErrorsPolicy.allowedRoles)) {
    forbidden();
  }

  const input = parseObservabilityErrorsListSearchParams(resolvedSearchParams);
  const initialData = await prefetchObservabilityErrorsList(input);

  return <CmsErrorsScreen initialInput={input} initialData={initialData} />;
}
