"use client";

import { useEffect } from "react";

import {
  CmsSystemActionButton,
  CmsSystemActionLink,
  CmsSystemScreen,
} from "@/components/cms/common";
import { i18n } from "@/lib/i18n";
import { reportClientError } from "@/lib/telemetry/client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const text = i18n.cms.system;

  useEffect(() => {
    reportClientError({
      error,
      source: "boundary",
      metadata: { boundary: "app/error" },
    });
  }, [error]);

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
          <CmsSystemActionLink href="/" tone="foreground">
            {text.goHome}
          </CmsSystemActionLink>
        </>
      }
    />
  );
}
