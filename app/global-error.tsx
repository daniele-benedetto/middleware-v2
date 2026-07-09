"use client";

import { Archivo, Spectral } from "next/font/google";

import {
  CmsSystemActionButton,
  CmsSystemActionLink,
  CmsSystemScreen,
} from "@/components/cms/common";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
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
      className={cn("h-full antialiased font-sans", archivo.variable, spectral.variable)}
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
