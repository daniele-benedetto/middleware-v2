import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PublicStaticPage } from "@/components/public/pages";
import { i18n } from "@/lib/i18n";
import { getPublicStaticPageData } from "@/lib/public/server/page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicStaticPageRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PublicStaticPageRouteProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const { page, description, canonicalPath } = await getPublicStaticPageData(slug);

  if (!page) {
    return buildPageMetadata({
      title: i18n.public.metadata.staticPageNotFound,
      path: `/${slug}`,
      index: false,
    });
  }

  return buildPageMetadata({
    title: page.title,
    description,
    path: canonicalPath,
  });
}

export default async function PublicStaticPageRoute({ params }: PublicStaticPageRouteProps) {
  await connection();
  const { slug } = await params;
  const { page } = await getPublicStaticPageData(slug);

  if (!page) {
    notFound();
  }

  return <PublicStaticPage page={page} />;
}
