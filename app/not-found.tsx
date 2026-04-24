import Link from "next/link";

import {
  CmsBodyText,
  CmsBrand,
  CmsEyebrow,
  CmsHeading,
  CmsSurface,
} from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";

export default function NotFound() {
  const text = i18n.cms.system;

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-215 items-center px-6 py-12">
      <CmsSurface border="strong" spacing="xl" className="mx-auto w-full max-w-140 space-y-5">
        <CmsBrand size="md" to="/cms" />

        <div className="space-y-3">
          <CmsEyebrow tone="accent">{text.notFoundCode}</CmsEyebrow>
          <CmsHeading size="page">{text.notFoundTitle}</CmsHeading>
          <CmsBodyText size="md" tone="muted" className="max-w-120">
            {text.notFoundDescription}
          </CmsBodyText>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/"
            className="inline-flex border border-accent px-4 py-2 font-ui text-[11px] uppercase tracking-[0.08em] text-accent hover:bg-card-hover"
          >
            {text.goHome}
          </Link>
        </div>
      </CmsSurface>
    </main>
  );
}
