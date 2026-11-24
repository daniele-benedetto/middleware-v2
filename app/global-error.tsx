"use client";

import {
  PublicSystemActionButton,
  PublicSystemActionLink,
  PublicSystemScreen,
} from "@/components/public";
import { i18n } from "@/lib/i18n/public";
import { cn } from "@/lib/utils";

import { archivo, spectral } from "./fonts";
import "./globals.css";

type GlobalErrorProps = {
  error: Error;
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  const text = i18n.public.system;

  return (
    <html
      lang="it"
      className={cn("h-full antialiased font-sans", archivo.variable, spectral.variable)}
    >
      <body className="min-h-svh bg-background text-foreground">
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
      </body>
    </html>
  );
}
