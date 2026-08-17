import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { parseAudioChunks, type AudioChunk } from "@/lib/audio/audio-chunks";
import { extractCmsMediaPathname } from "@/lib/media/blob";
import { ApiError } from "@/lib/server/http/api-error";
import { publicCoursesService } from "@/lib/server/modules/courses/service/public";
import { publicLessonsService } from "@/lib/server/modules/lessons/service/public";
import { mediaStorage } from "@/lib/server/storage/media-storage";

import type { PublicLessonDetailDto } from "@/lib/server/modules/lessons/dto/public";

export const PUBLIC_LESSON_LISTEN_PAGE_REVALIDATE_SECONDS = 60 * 60;
export const PUBLIC_LESSON_LISTEN_PAGE_CACHE_TAG = "public-course";

export type PublicLessonListenPageData = {
  lesson: PublicLessonDetailDto;
  lessonNumber: number | null;
  chunks: AudioChunk[];
};

async function readStreamAsText(stream: ReadableStream<Uint8Array>) {
  const response = new Response(stream);
  return response.text();
}

async function loadJsonFromBlobUrl(value: string) {
  const pathname = extractCmsMediaPathname(value);

  if (!pathname) {
    return null;
  }

  const result = await mediaStorage.get(pathname);

  if (result.contentType !== "application/json") {
    return null;
  }

  return JSON.parse(await readStreamAsText(result.stream));
}

async function loadJsonFromUrl(value: string) {
  try {
    const blobJson = await loadJsonFromBlobUrl(value);
    if (blobJson) return blobJson;

    const response = await fetch(value, {
      next: { revalidate: PUBLIC_LESSON_LISTEN_PAGE_REVALIDATE_SECONDS },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return null;

    return response.json();
  } catch {
    return null;
  }
}

async function loadAudioChunks(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return parseAudioChunks(await loadJsonFromUrl(value));
  }

  return parseAudioChunks(value);
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

export async function getPublicLessonListenPageData(
  courseSlug: string,
  lessonSlug: string,
): Promise<PublicLessonListenPageData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_LESSON_LISTEN_PAGE_CACHE_TAG);

  const lesson = await getLessonBySlug(courseSlug, lessonSlug);

  if (!lesson?.audioUrl) {
    return null;
  }

  return {
    lesson,
    lessonNumber: await getLessonNumber(courseSlug, lesson.id),
    chunks: await loadAudioChunks(lesson.audioChunks),
  };
}
