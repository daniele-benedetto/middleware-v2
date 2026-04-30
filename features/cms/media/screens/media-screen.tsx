"use client";

import { CmsPageHeader } from "@/components/cms/primitives";
import { CmsMediaLibrary } from "@/features/cms/media/components/media-library";
import { i18n } from "@/lib/i18n";

import type { RouterOutputs } from "@/lib/trpc/types";

type MediaListInitialData = RouterOutputs["media"]["list"];

type CmsMediaScreenProps = {
  initialData: MediaListInitialData;
};

export function CmsMediaScreen({ initialData }: CmsMediaScreenProps) {
  const text = i18n.cms;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader title={text.navigation.media} />
      <CmsMediaLibrary initialData={initialData} />
    </div>
  );
}
