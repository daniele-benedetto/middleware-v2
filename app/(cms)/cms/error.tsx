"use client";

import {
  CmsBodyText,
  CmsBrand,
  CmsEyebrow,
  CmsHeading,
  CmsSurface,
} from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";

type CmsErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CmsErrorPage({ reset }: CmsErrorPageProps) {
  const text = i18n.cms.system;

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-190 items-center px-5 py-8">
      <CmsSurface border="strong" spacing="xl" className="w-full space-y-5">
        <CmsBrand size="sm" to="/cms" onClick={reset} />

        <div className="space-y-3">
          <CmsEyebrow tone="accent">{text.errorCode}</CmsEyebrow>
          <CmsHeading size="page">{text.errorTitle}</CmsHeading>
          <CmsBodyText size="md" tone="muted" className="max-w-130">
            {text.errorDescription}
          </CmsBodyText>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex border border-foreground px-4 py-2 font-ui text-[11px] uppercase tracking-[0.08em] hover:bg-card-hover"
          >
            {text.retry}
          </button>
        </div>
      </CmsSurface>
    </div>
  );
}
