import { notFound } from "next/navigation";
import { connection } from "next/server";

import { LessonListenPage } from "@/components/public/listen/lesson-listen-page";
import { i18n } from "@/lib/i18n";
import { getPublicLessonListenPageData } from "@/lib/public/server/lesson-listen-page";
import { buildArticleListenMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicLessonListenRouteProps = {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
};

export async function generateMetadata({
  params,
}: PublicLessonListenRouteProps): Promise<Metadata> {
  await connection();
  const { courseSlug, lessonSlug } = await params;
  const data = await getPublicLessonListenPageData(courseSlug, lessonSlug);
  const text = i18n.public.lessonPage.listen;

  if (!data) {
    return buildArticleListenMetadata({
      title: text.notFoundTitle,
      slug: lessonSlug,
    });
  }

  return buildArticleListenMetadata({
    title: text.metadataTitle(data.lesson.title),
    description: data.lesson.excerpt ?? undefined,
    slug: data.lesson.slug,
    imageUrl: data.lesson.imageUrl,
  });
}

export default async function PublicLessonListenRoute({ params }: PublicLessonListenRouteProps) {
  await connection();
  const { courseSlug, lessonSlug } = await params;
  const data = await getPublicLessonListenPageData(courseSlug, lessonSlug);

  if (!data) {
    notFound();
  }

  return <LessonListenPage data={data} />;
}
