"use client";

import {
  CmsSystemActionButton,
  CmsSystemActionLink,
  CmsSystemScreen,
} from "@/components/cms/common";
import { i18n } from "@/lib/i18n";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const text = i18n.cms.system;

  return (
    <CmsSystemScreen
      code={text.errorCode}
      title={text.errorTitle}
      description={text.errorDescription}
      digest={error.digest}
      actions={
        <>
          <CmsSystemActionButton onClick={reset} tone="accent">
            {text.retry}
          </CmsSystemActionButton>
          <CmsSystemActionLink href="/" tone="foreground">
            {text.goHome}
          </CmsSystemActionLink>
        </>
      }
    />
  );
}
