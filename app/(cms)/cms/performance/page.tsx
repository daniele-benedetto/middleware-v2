import { forbidden } from "next/navigation";

import { CmsEmptyState } from "@/components/cms/common";
import { CmsPageHeader } from "@/components/cms/primitives";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";
import { telemetryPolicy } from "@/lib/server/modules/telemetry";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.performance,
  description: i18n.cms.lists.performance.subtitle,
  path: "/cms/performance",
});

export default async function CmsPerformancePage() {
  const session = await requireCmsSession("/cms/performance");

  if (!hasAnyCmsRole(session, telemetryPolicy.allowedRoles)) {
    forbidden();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader title={i18n.cms.navigation.performance} />
      <CmsEmptyState
        title="Performance qualitativa fuori scope Fase 1"
        description="I Web Vitals provvisori sono stati rimossi. La pagina tornera quando PerformanceExperience sostituira gli aggregati tecnici legacy."
      />
    </div>
  );
}
