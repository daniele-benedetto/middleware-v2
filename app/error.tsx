"use client";

import {
  PublicSystemActionButton,
  PublicSystemActionLink,
  PublicSystemScreen,
} from "@/components/public";
import { i18n } from "@/lib/i18n";

type ErrorPageProps = {
  error: Error;
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  const text = i18n.public.system;

  return (
    <main className="flex min-h-svh flex-col bg-background font-heading text-foreground">
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
    </main>
  );
}
