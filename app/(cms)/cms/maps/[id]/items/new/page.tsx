import { CmsMapItemFormScreen } from "@/features/cms/maps/screens/map-item-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchMapById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

import type { MapCoordinates } from "@/features/cms/maps/utils/coordinates";

export const metadata = buildCmsMetadata({
  title: i18n.cms.forms.resources.maps.createItemTitle,
  path: "/cms/maps/[id]/items/new",
});

type CmsMapItemNewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseInitialCoordinates(
  searchParams: Record<string, string | string[] | undefined>,
): MapCoordinates | undefined {
  const latitude = Number(searchParams.latitude);
  const longitude = Number(searchParams.longitude);

  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : undefined;
}

export default async function CmsMapItemNewPage({ params, searchParams }: CmsMapItemNewPageProps) {
  const { id: rawMapId } = await params;
  const mapId = resolveCmsRouteEntityIdOrNotFound(rawMapId);
  const initialMap = await prefetchCmsDetailOrNotFound(() => prefetchMapById(mapId));
  const initialCoordinates = parseInitialCoordinates(await searchParams);

  return (
    <CmsMapItemFormScreen
      mode="create"
      mapId={mapId}
      initialMap={initialMap}
      initialCoordinates={initialCoordinates}
    />
  );
}
