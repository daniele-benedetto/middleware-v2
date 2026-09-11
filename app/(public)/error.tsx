"use client";

import {
  PublicSystemActionButton,
  PublicSystemActionLink,
  PublicSystemScreen,
} from "@/components/public";
import { i18n } from "@/lib/i18n";

export default function PublicError({ reset }: { error: Error; reset: () => void }) {
  const text = i18n.public.system;

  return (
    <PublicSystemScreen
      code={text.errorCode}
      kicker={text.errorKicker}
      title={text.errorTitle}
      description={text.errorDescription}
      actions={
        <>
          <PublicSystemActionButton onClick={reset} tone="accent">
            {text.retry}
          </PublicSystemActionButton>
          <PublicSystemActionLink href="/" tone="foreground">
            {text.goHome}
          </PublicSystemActionLink>
        </>
      }
    />
  );
}
