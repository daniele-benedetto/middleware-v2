"use client";

import { Archivo, IBM_Plex_Mono, Spectral } from "next/font/google";
import { useEffect } from "react";

import {
  CmsSystemActionButton,
  CmsSystemActionLink,
  CmsSystemScreen,
} from "@/components/cms/common";
import { i18n } from "@/lib/i18n";
import { reportClientError } from "@/lib/telemetry/client";
import { cn } from "@/lib/utils";

import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
});

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const text = i18n.cms.system;

  useEffect(() => {
    reportClientError({
      error,
      source: "boundary",
      metadata: { boundary: "app/global-error" },
    });
  }, [error]);

  return (
    <html
      lang="it"
      className={cn(
        "h-full antialiased font-sans",
        archivo.variable,
        spectral.variable,
        ibmPlexMono.variable,
      )}
    >
      <body className="min-h-svh bg-background text-foreground">
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
      </body>
    </html>
  );
}
