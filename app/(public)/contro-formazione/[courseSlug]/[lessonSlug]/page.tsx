import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PublicLessonPage } from "@/components/public/pages";
import { i18n } from "@/lib/i18n";
import { getPublicLessonPageData } from "@/lib/public/server/course-page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicLessonRouteProps = {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
};

export async function generateMetadata({ params }: PublicLessonRouteProps): Promise<Metadata> {
  await connection();
  const { courseSlug, lessonSlug } = await params;
  const { lesson, description } = await getPublicLessonPageData(courseSlug, lessonSlug);

  if (!lesson) {
    return buildPageMetadata({
      title: i18n.public.metadata.lessonNotFound,
      path: `/contro-formazione/${courseSlug}/${lessonSlug}`,
      index: false,
    });
  }

  return buildPageMetadata({
    title: lesson.title,
    description,
    path: `/contro-formazione/${lesson.courseSlug}/${lesson.slug}`,
    openGraphImage: lesson.imageUrl ?? undefined,
  });
}

export default async function PublicLessonRoute({ params }: PublicLessonRouteProps) {
  await connection();
  const { courseSlug, lessonSlug } = await params;
  const { lesson, lessonNumber, otherLessons } = await getPublicLessonPageData(
    courseSlug,
    lessonSlug,
  );

  if (!lesson) {
    notFound();
  }

  return (
    <PublicLessonPage lesson={lesson} lessonNumber={lessonNumber} otherLessons={otherLessons} />
  );
}
