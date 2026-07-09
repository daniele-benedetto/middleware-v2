import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PublicStaticPage } from "@/components/public/pages";
import { i18n } from "@/lib/i18n";
import { getPublicStaticPageData } from "@/lib/public/server/page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicStaticPageRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PublicStaticPageRouteProps): Promise<Metadata> {
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

async function PublicStaticPageRouteContent({ params }: PublicStaticPageRouteProps) {
  const { slug } = await params;
  const { page } = await getPublicStaticPageData(slug);

  if (!page) {
    notFound();
  }

  return <PublicStaticPage page={page} />;
}

export default function PublicStaticPageRoute({ params }: PublicStaticPageRouteProps) {
  return (
    <Suspense fallback={null}>
      <PublicStaticPageRouteContent params={params} />
    </Suspense>
  );
}
