import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { type AudioChunk } from "@/lib/audio/audio-chunks";
import { loadPublicAudioChunks } from "@/lib/public/server/audio-chunk-source";
import { ApiError } from "@/lib/server/http/api-error";
import { publicCoursesService } from "@/lib/server/modules/courses/service/public";
import { publicLessonsService } from "@/lib/server/modules/lessons/service/public";

import type { PublicLessonDetailDto } from "@/lib/server/modules/lessons/dto/public";

export const PUBLIC_LESSON_LISTEN_PAGE_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_LESSON_LISTEN_PAGE_CACHE_TAG = "public-course";

export type PublicLessonListenMetadataData = {
  lesson: PublicLessonDetailDto;
};

export type PublicLessonListenPageData = PublicLessonListenMetadataData & {
  lessonNumber: number | null;
};

async function loadAudioChunks(value: unknown) {
  return loadPublicAudioChunks(value);
}

async function getLessonBySlug(courseSlug: string, lessonSlug: string) {
  try {
    return await publicLessonsService.getBySlug(courseSlug, lessonSlug);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      return null;
    }

    console.error("public.getPublicLessonListenPageData lesson failed", {
      courseSlug,
      lessonSlug,
      error,
    });
    throw error;
  }
}

async function getLessonNumber(courseSlug: string, lessonId: string) {
  try {
    const course = await publicCoursesService.getBySlug(courseSlug);
    const index = course.lessons.findIndex((lesson) => lesson.id === lessonId);
    return index >= 0 ? index + 1 : null;
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      return null;
    }

    console.error("public.getPublicLessonListenPageData course failed", {
      courseSlug,
      lessonId,
      error,
    });
    throw error;
  }
}

export async function getPublicLessonListenMetadataData(
  courseSlug: string,
  lessonSlug: string,
): Promise<PublicLessonListenMetadataData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_LESSON_LISTEN_PAGE_CACHE_TAG);

  const lesson = await getLessonBySlug(courseSlug, lessonSlug);

  if (!lesson?.audioUrl) {
    return null;
  }

  return { lesson };
}

export async function getPublicLessonListenChunks(
  courseSlug: string,
  lessonSlug: string,
): Promise<AudioChunk[] | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_LESSON_LISTEN_PAGE_CACHE_TAG);

  const data = await getPublicLessonListenMetadataData(courseSlug, lessonSlug);

  if (!data) {
    return null;
  }

  return loadAudioChunks(data.lesson.audioChunks);
}

export async function getPublicLessonListenPageData(
  courseSlug: string,
  lessonSlug: string,
): Promise<PublicLessonListenPageData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_LESSON_LISTEN_PAGE_CACHE_TAG);

  const data = await getPublicLessonListenMetadataData(courseSlug, lessonSlug);

  if (!data) {
    return null;
  }

  return {
    ...data,
    lessonNumber: await getLessonNumber(courseSlug, data.lesson.id),
  };
}
