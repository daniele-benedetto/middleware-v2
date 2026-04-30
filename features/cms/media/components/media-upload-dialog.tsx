"use client";

import { upload } from "@vercel/blob/client";
import { X } from "lucide-react";
import { useState } from "react";

import {
  CmsActionButton,
  CmsFormField,
  CmsMetaText,
  CmsTextInput,
  cmsToast,
} from "@/components/cms/primitives";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { i18n } from "@/lib/i18n";
import {
  buildCmsMediaUploadAccept,
  buildMediaPathname,
  cmsMediaDefaultKinds,
  cmsMediaBlobAccess,
  cmsMediaUploadMaxSizeInBytes,
  inferMediaKind,
  parseMediaPathname,
  resolveCmsMediaContentTypeFromExtension,
  sanitizeMediaBaseName,
} from "@/lib/media/blob";

import type { CmsSupportedMediaKind } from "@/lib/media/blob";
import type { PutBlobResult } from "@vercel/blob";
import type { FormEvent } from "react";

const multipartUploadThresholdBytes = 4_500_000;

type CmsMediaUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (blob: PutBlobResult) => Promise<void>;
  allowedKinds?: CmsSupportedMediaKind[];
};

function resolveUploadContentType(file: File) {
  if (file.type) {
    return file.type;
  }

  return resolveCmsMediaContentTypeFromExtension(file.name);
}

export function CmsMediaUploadDialog({
  open,
  onOpenChange,
  onUploaded,
  allowedKinds = cmsMediaDefaultKinds,
}: CmsMediaUploadDialogProps) {
  const mediaText = i18n.cms.lists.media;
  const commonText = i18n.cms.common;
  const [file, setFile] = useState<File | null>(null);
  const [baseName, setBaseName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const parsedFile = file ? parseMediaPathname(file.name) : null;
  const normalizedBaseName = sanitizeMediaBaseName(baseName);
  const pathname =
    parsedFile && normalizedBaseName
      ? buildMediaPathname({ baseName: normalizedBaseName, extension: parsedFile.extension })
      : "";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file || !parsedFile) {
      cmsToast.error(mediaText.uploadTypeInvalid, mediaText.uploadTitle);
      return;
    }

    const contentType = resolveUploadContentType(file);

    if (!pathname) {
      cmsToast.error(mediaText.uploadNameInvalid, mediaText.uploadTitle);
      return;
    }

    const mediaKind = inferMediaKind(pathname, contentType);

    if (mediaKind === "other" || !allowedKinds.includes(mediaKind)) {
      cmsToast.error(mediaText.uploadTypeInvalid, mediaText.uploadTitle);
      return;
    }

    if (file.size > cmsMediaUploadMaxSizeInBytes) {
      cmsToast.error(
        mediaText.uploadSizeHint(Math.round(cmsMediaUploadMaxSizeInBytes / (1024 * 1024))),
        mediaText.uploadTitle,
      );
      return;
    }

    setIsUploading(true);

    try {
      const blob = await upload(pathname, file, {
        access: cmsMediaBlobAccess,
        handleUploadUrl: "/api/cms/media/upload",
        clientPayload: JSON.stringify({ kinds: allowedKinds }),
        multipart: file.size > multipartUploadThresholdBytes,
        contentType,
      });

      await onUploaded(blob);
      onOpenChange(false);
    } catch (error) {
      cmsToast.error(
        error instanceof Error ? error.message : mediaText.previewError,
        mediaText.uploadTitle,
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setFile(null);
          setBaseName("");
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] max-w-190 gap-0 rounded-none border border-foreground bg-(--bg-main) p-0 ring-0"
      >
        <div className="border-b-[3px] border-foreground bg-background px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="font-display text-[20px] uppercase leading-none tracking-[-0.02em] text-foreground">
                {mediaText.uploadTitle}
              </DialogTitle>
            </div>
            <DialogClose className="inline-flex size-8 shrink-0 items-center justify-center border border-foreground bg-transparent transition-colors hover:bg-card-hover">
              <X className="size-3.5" aria-hidden />
              <span className="sr-only">{commonText.close}</span>
            </DialogClose>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <DialogDescription className="max-w-120 font-editorial text-[15px] leading-[1.5] text-foreground">
            {mediaText.uploadDescription}
          </DialogDescription>

          <CmsFormField
            label={mediaText.uploadFieldLabel}
            htmlFor="cms-media-upload-file"
            hint={`${mediaText.uploadFieldHint} ${mediaText.uploadSizeHint(Math.round(cmsMediaUploadMaxSizeInBytes / (1024 * 1024)))}`}
          >
            <input
              id="cms-media-upload-file"
              type="file"
              accept={buildCmsMediaUploadAccept(allowedKinds)}
              disabled={isUploading}
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                setBaseName(nextFile ? parseMediaPathname(nextFile.name).baseName : "");
              }}
              className="block w-full cursor-pointer rounded-none border border-foreground bg-white px-3 py-2.5 font-ui text-[12px] uppercase tracking-[0.04em] text-foreground file:mr-3 file:border-0 file:bg-transparent file:font-ui file:text-[11px] file:uppercase file:tracking-[0.08em] file:text-muted-foreground"
            />
          </CmsFormField>

          <CmsFormField
            label={mediaText.uploadNameLabel}
            htmlFor="cms-media-upload-name"
            hint={mediaText.uploadNameHint}
          >
            <CmsTextInput
              id="cms-media-upload-name"
              tone="ui"
              value={baseName}
              disabled={isUploading || !file}
              onChange={(event) => setBaseName(event.target.value)}
            />
          </CmsFormField>

          {parsedFile ? (
            <div className="space-y-1.5 border border-foreground bg-white px-4 py-3">
              <CmsMetaText variant="tiny">{pathname || parsedFile.fileName}</CmsMetaText>
              <CmsMetaText variant="tiny">{mediaText.placeholderLabel}</CmsMetaText>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2.5 border-t-[3px] border-foreground pt-4">
            <CmsActionButton type="submit" variant="primary" size="md" isLoading={isUploading}>
              {isUploading ? mediaText.uploadSubmitting : `→ ${mediaText.uploadSubmit}`}
            </CmsActionButton>
            <DialogClose
              render={
                <CmsActionButton variant="outline" size="md">
                  {commonText.cancel}
                </CmsActionButton>
              }
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
