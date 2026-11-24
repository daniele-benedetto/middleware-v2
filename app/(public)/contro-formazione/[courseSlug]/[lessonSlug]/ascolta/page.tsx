import { notFound } from "next/navigation";

import { LessonListenPage } from "@/components/public/listen/lesson-listen-page";
import { i18n } from "@/lib/i18n";
import {
  getPublicLessonListenChunks,
  getPublicLessonListenMetadataData,
  getPublicLessonListenPageData,
} from "@/lib/public/server/lesson-listen-page";
import { buildListenMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicLessonListenRouteProps = {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
};

async function PublicLessonListenRouteContent({ params }: PublicLessonListenRouteProps) {
  const { courseSlug, lessonSlug } = await params;
  const dataPromise = getPublicLessonListenPageData(courseSlug, lessonSlug);
  const chunksPromise = getPublicLessonListenChunks(courseSlug, lessonSlug);
  const data = await dataPromise;

  if (!data) {
    notFound();
  }

  const chunks = await chunksPromise;

  return <LessonListenPage data={data} chunks={chunks ?? []} />;
}

export async function generateMetadata({
  params,
}: PublicLessonListenRouteProps): Promise<Metadata> {
  const { courseSlug, lessonSlug } = await params;
  const data = await getPublicLessonListenMetadataData(courseSlug, lessonSlug);
  const text = i18n.public.lessonPage.listen;

  if (!data) {
    return buildListenMetadata({
      title: text.notFoundTitle,
      path: `/contro-formazione/${courseSlug}/${lessonSlug}/ascolta`,
    });
  }

  return buildListenMetadata({
    title: text.metadataTitle(data.lesson.title),
    description: data.lesson.excerpt ?? undefined,
    path: `/contro-formazione/${data.lesson.courseSlug}/${data.lesson.slug}/ascolta`,
    imageUrl: data.lesson.imageUrl,
  });
}

export default function PublicLessonListenRoute({ params }: PublicLessonListenRouteProps) {
  return <PublicLessonListenRouteContent params={params} />;
}
