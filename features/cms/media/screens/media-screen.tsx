"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

import { CmsActionButton, CmsPageHeader } from "@/components/cms/primitives";
import { CmsMediaLibrary } from "@/features/cms/media/components/media-library";
import { i18n } from "@/lib/i18n";

import type { RouterOutputs } from "@/lib/trpc/types";

type MediaListInitialData = RouterOutputs["media"]["list"];

type CmsMediaScreenProps = {
  initialData: MediaListInitialData;
};

export function CmsMediaScreen({ initialData }: CmsMediaScreenProps) {
  const text = i18n.cms;
  const mediaText = text.lists.media;
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CmsPageHeader
        title={text.navigation.media}
        actions={
          <CmsActionButton variant="outline" onClick={() => setIsUploadOpen(true)}>
            <Upload aria-hidden />
            {mediaText.uploadShortCta}
          </CmsActionButton>
        }
      />
      <CmsMediaLibrary
        initialData={initialData}
        uploadOpen={isUploadOpen}
        onUploadOpenChange={setIsUploadOpen}
        showUploadActionInToolbar={false}
      />
    </div>
  );
}
