import { Archivo, IBM_Plex_Mono, Spectral } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { buildRootMetadata } from "@/lib/seo";
import { TrpcProvider } from "@/lib/trpc/provider";
import { cn } from "@/lib/utils";

import type { Metadata, Viewport } from "next";

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

export const metadata: Metadata = buildRootMetadata();

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      data-scroll-behavior="smooth"
      className={cn(
        "h-full",
        "antialiased",
        "motion-safe:scroll-smooth",
        archivo.variable,
        spectral.variable,
        ibmPlexMono.variable,
        "font-sans",
      )}
    >
      <body className="flex min-h-full flex-col scrollbar-thin scrollbar-track-background scrollbar-thumb-border md:hover:scrollbar-thumb-foreground">
        <TrpcProvider>{children}</TrpcProvider>
        <Toaster />
      </body>
    </html>
  );
}
