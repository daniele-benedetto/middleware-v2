"use client";

import {
  CmsSystemActionButton,
  CmsSystemActionLink,
  CmsSystemScreen,
} from "@/components/cms/common";
import { i18n } from "@/lib/i18n";

type CmsErrorPageProps = {
  error: Error;
  reset: () => void;
};

export default function CmsErrorPage({ reset }: CmsErrorPageProps) {
  const text = i18n.cms.system;

  return (
    <CmsSystemScreen
      code={text.errorCode}
      title={text.errorTitle}
      description={text.errorDescription}
      actions={
        <>
          <CmsSystemActionButton onClick={reset} tone="accent">
            {text.retry}
          </CmsSystemActionButton>
          <CmsSystemActionLink href="/cms" tone="foreground">
            {text.goHome}
          </CmsSystemActionLink>
        </>
      }
    />
  );
}
