import { forbidden } from "next/navigation";

import { CmsAuditLogsListScreen } from "@/features/cms/audit-logs/screens/audit-logs-list-screen";
import { hasCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { parseAuditLogsListSearchParams } from "@/lib/cms/query";
import { prefetchAuditLogsList } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.auditLogs,
  description: i18n.cms.lists.auditLogs.subtitle,
  path: "/cms/audit-logs",
});

type CmsAuditLogsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsAuditLogsPage({ searchParams }: CmsAuditLogsPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await requireCmsSession("/cms/audit-logs");

  if (!hasCmsRole(session, "ADMIN")) {
    forbidden();
  }

  const input = parseAuditLogsListSearchParams(resolvedSearchParams);
  const initialData = await prefetchAuditLogsList(input);

  return <CmsAuditLogsListScreen initialInput={input} initialData={initialData} />;
}
