import { Archivo_Black, Geist, IBM_Plex_Mono, Newsreader } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { buildRootMetadata } from "@/lib/seo";
import { TrpcProvider } from "@/lib/trpc/provider";
import { cn } from "@/lib/utils";

import type { Metadata, Viewport } from "next";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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

export const metadata: Metadata = buildRootMetadata();

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
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
      className={cn(
        "h-full",
        "antialiased",
        archivoBlack.variable,
        newsreader.variable,
        ibmPlexMono.variable,
        "font-sans",
        geist.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <TrpcProvider>{children}</TrpcProvider>
        <Toaster />
      </body>
    </html>
  );
}
