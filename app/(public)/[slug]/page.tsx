import { notFound } from "next/navigation";

import { PublicStaticPage } from "@/components/public/pages";
import { PUBLIC_STATIC_PAGE_SLUGS } from "@/lib/public/pages/static-pages";
import { getPublicStaticPageData } from "@/lib/public/server/page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicStaticPageRouteProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return PUBLIC_STATIC_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PublicStaticPageRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const { page, description, canonicalPath } = await getPublicStaticPageData(slug);

  if (!page) {
    return buildPageMetadata({ title: "Pagina non trovata", path: `/${slug}`, index: false });
  }

  return buildPageMetadata({
    title: page.title,
    description,
    path: canonicalPath,
  });
}

export default async function PublicStaticPageRoute({ params }: PublicStaticPageRouteProps) {
  const { slug } = await params;
  const { page } = await getPublicStaticPageData(slug);

  if (!page) {
    notFound();
  }

  return <PublicStaticPage page={page} />;
}
