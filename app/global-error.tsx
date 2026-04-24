"use client";

import { Archivo_Black, IBM_Plex_Mono, Newsreader } from "next/font/google";

import {
  CmsSystemActionButton,
  CmsSystemActionLink,
  CmsSystemScreen,
} from "@/components/cms/common";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import "./globals.css";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
});

type GlobalErrorProps = {
  error: Error;
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  const text = i18n.cms.system;

  return (
    <html
      lang="it"
      className={cn(
        "h-full antialiased font-sans",
        archivoBlack.variable,
        newsreader.variable,
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
