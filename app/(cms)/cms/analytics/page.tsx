import { forbidden } from "next/navigation";

import { CmsEmptyState } from "@/components/cms/common";
import { CmsPageHeader } from "@/components/cms/primitives";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";
import { telemetryPolicy } from "@/lib/server/modules/telemetry";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.analytics,
  description: i18n.cms.lists.analytics.subtitle,
  path: "/cms/analytics",
});

export default async function CmsAnalyticsPage() {
  const session = await requireCmsSession("/cms/analytics");

  if (!hasAnyCmsRole(session, telemetryPolicy.allowedRoles)) {
    forbidden();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader title={i18n.cms.navigation.analytics} />
      <CmsEmptyState
        title="Telemetry editoriale fuori scope Fase 1"
        description="Le metriche basate su page view sono state rimosse. La dashboard tornera con ContentEngagement e letture qualificate nella fase dedicata."
      />
    </div>
  );
}
