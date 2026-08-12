import { notFound } from "next/navigation";

import { CmsMapItemFormScreen } from "@/features/cms/maps/screens/map-item-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchMapById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.maps.editItemTitle,
  path: "/cms/maps/[id]/items/[itemId]/edit",
});

type CmsMapItemEditPageProps = {
  params: Promise<{ id: string; itemId: string }>;
};

export default async function CmsMapItemEditPage({ params }: CmsMapItemEditPageProps) {
  const { id: rawMapId, itemId: rawItemId } = await params;
  const mapId = resolveCmsRouteEntityIdOrNotFound(rawMapId);
  const itemId = resolveCmsRouteEntityIdOrNotFound(rawItemId);
  const initialMap = await prefetchCmsDetailOrNotFound(() => prefetchMapById(mapId));

  if (!initialMap.items.some((item) => item.id === itemId)) notFound();

  return <CmsMapItemFormScreen mode="edit" mapId={mapId} itemId={itemId} initialMap={initialMap} />;
}
