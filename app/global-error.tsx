"use client";

import {
  CmsBodyText,
  CmsBrand,
  CmsEyebrow,
  CmsHeading,
  CmsSurface,
} from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  const text = i18n.cms.system;

  return (
    <html lang="it">
      <body className="min-h-svh bg-background">
        <main className="mx-auto flex min-h-svh w-full max-w-215 items-center px-6 py-12">
          <CmsSurface border="strong" spacing="xl" className="mx-auto w-full max-w-140 space-y-5">
            <CmsBrand size="md" to="/cms" />

            <div className="space-y-3">
              <CmsEyebrow tone="accent">{text.errorCode}</CmsEyebrow>
              <CmsHeading size="page">{text.errorTitle}</CmsHeading>
              <CmsBodyText size="md" tone="muted" className="max-w-120">
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
        </main>
      </body>
    </html>
  );
}
