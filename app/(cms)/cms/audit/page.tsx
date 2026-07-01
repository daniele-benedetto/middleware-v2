import { forbidden } from "next/navigation";

import { CmsAuditListScreen } from "@/features/cms/observability-audit/screens/audit-list-screen";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { parseObservabilityAuditListSearchParams } from "@/lib/cms/query";
import { prefetchObservabilityAuditList } from "@/lib/cms/trpc/server-prefetch";
import { buildCmsMetadata } from "@/lib/seo";
import { observabilityAuditPolicy } from "@/lib/server/modules/observability-audit";

export const metadata = buildCmsMetadata({
  title: "Audit",
  description: "Timeline di responsabilità, rischio e impatto pubblico delle attività CMS.",
  path: "/cms/audit",
});

type CmsAuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsAuditPage({ searchParams }: CmsAuditPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await requireCmsSession("/cms/audit");

  if (!hasAnyCmsRole(session, observabilityAuditPolicy.allowedRoles)) {
    forbidden();
  }

  const input = parseObservabilityAuditListSearchParams(resolvedSearchParams);
  const initialData = await prefetchObservabilityAuditList(input);

  return <CmsAuditListScreen initialInput={input} initialData={initialData} />;
}
