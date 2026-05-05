"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { CmsBody, CmsMetaText } from "@/components/cms/primitives";
import { CmsMediaImage } from "@/features/cms/media/components/media-image";
import { i18n } from "@/lib/i18n";
import { extractCmsMediaPathname, resolveCmsMediaPreviewUrl } from "@/lib/media/blob";

type ArticleMediaFieldPreviewProps = {
  kind: "image" | "audio" | "json";
  url: string;
};

function ArticleImagePreview({ url }: { url: string }) {
  const pathname = extractCmsMediaPathname(url);

  return (
    <div className="relative aspect-16/10 overflow-hidden border border-foreground bg-card-hover">
      {pathname ? (
        <CmsMediaImage
          pathname={pathname}
          alt="Article image preview"
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover"
        />
      ) : (
        <Image
          fill
          src={url}
          alt="Article image preview"
          sizes="(max-width: 1024px) 100vw, 40vw"
          unoptimized
          className="object-cover"
        />
      )}
    </div>
  );
}

function ArticleAudioPreview({ url }: { url: string }) {
  return (
    <div className="border border-foreground bg-card-hover p-4">
      <audio controls preload="metadata" className="w-full" src={resolveCmsMediaPreviewUrl(url)}>
        Audio preview
      </audio>
    </div>
  );
}

function ArticleJsonPreview({ url }: { url: string }) {
  const mediaText = i18n.cms.lists.media;
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch(resolveCmsMediaPreviewUrl(url), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(mediaText.previewError);
        }

        const text = await response.text();

        try {
          setContent(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          setContent(text);
        }
      })
      .catch((nextError) => {
        if (!controller.signal.aborted) {
          setError(nextError instanceof Error ? nextError.message : mediaText.previewError);
        }
      });

    return () => {
      controller.abort();
    };
  }, [mediaText.previewError, url]);

  return (
    <div className="space-y-2 border border-foreground bg-card-hover p-4">
      <CmsMetaText variant="category">{mediaText.jsonPreviewLabel}</CmsMetaText>
      {error ? (
        <CmsBody size="sm" tone="accent">
          {error}
        </CmsBody>
      ) : content ? (
        <pre className="max-h-72 overflow-auto bg-white p-4 font-ui text-[12px] leading-[1.55] text-foreground whitespace-pre-wrap wrap-break-word">
          {content}
        </pre>
      ) : (
        <div className="font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
          {mediaText.previewLoading}
        </div>
      )}
    </div>
  );
}

export function ArticleMediaFieldPreview({ kind, url }: ArticleMediaFieldPreviewProps) {
  if (!url) {
    return null;
  }

  if (kind === "image") {
    return <ArticleImagePreview key={url} url={url} />;
  }

  if (kind === "audio") {
    return <ArticleAudioPreview key={url} url={url} />;
  }

  return <ArticleJsonPreview key={url} url={url} />;
}
