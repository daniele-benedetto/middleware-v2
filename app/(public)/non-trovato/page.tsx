import { notFound } from "next/navigation";

import { i18n } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

export const metadata: Metadata = buildPageMetadata({
  title: i18n.public.system.notFoundTitle,
  path: "/non-trovato",
  index: false,
});

export default function PublicContentNotFoundRoute() {
  notFound();
}
