import { CmsMapWorkspaceScreen } from "@/features/cms/maps/screens/map-workspace-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchMapById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.quickActions.edit} ${i18n.cms.navigation.maps}`,
  path: "/cms/maps/[id]/edit",
});

type CmsMapEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CmsMapEditPage({ params }: CmsMapEditPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const initialData = await prefetchCmsDetailOrNotFound(() => prefetchMapById(id));

  return <CmsMapWorkspaceScreen mapId={id} initialData={initialData} />;
}
