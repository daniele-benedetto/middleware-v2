import { getCmsDashboardMetrics } from "@/features/cms/dashboard/data/get-dashboard-metrics";
import { CmsDashboardScreen } from "@/features/cms/dashboard/screens/dashboard-screen";
import { requireCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.dashboard.title,
  description: i18n.cms.dashboard.subtitle,
  path: "/cms",
});

export default async function CmsDashboardPage() {
  const [session, metrics] = await Promise.all([
    requireCmsSession("/cms"),
    getCmsDashboardMetrics(),
  ]);

  return <CmsDashboardScreen role={session.user.role} metrics={metrics} />;
}
