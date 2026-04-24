import { CmsDashboardScreen } from "@/features/cms/dashboard/screens/dashboard-screen";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.dashboard.title,
  description: i18n.cms.dashboard.subtitle,
  path: "/cms",
});

export default function CmsDashboardPage() {
  return <CmsDashboardScreen />;
}
