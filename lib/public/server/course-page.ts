import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { publicCoursesService } from "@/lib/server/modules/courses/service/public";
import { publicLessonsService } from "@/lib/server/modules/lessons/service/public";

import type {
  PublicCourseDetailDto,
  PublicCourseLessonSummaryDto,
} from "@/lib/server/modules/courses/dto/public";
import type { PublicLessonDetailDto } from "@/lib/server/modules/lessons/dto/public";

export const PUBLIC_COURSE_PAGE_CACHE_TAG = "public-course";

export type PublicFormazioneIndexData = {
  courses: PublicCourseDetailDto[];
};

export type PublicCoursePageData = {
  course: PublicCourseDetailDto | null;
  publishedCourses: PublicCourseDetailDto[];
  description?: string;
};

export type PublicLessonSibling = {
  slug: string;
  title: string;
};

export type PublicLessonPageData = {
  lesson: PublicLessonDetailDto | null;
  lessonNumber: number | null;
  totalLessons: number;
  otherLessons: PublicCourseLessonSummaryDto[];
  previousLesson: PublicLessonSibling | null;
  nextLesson: PublicLessonSibling | null;
  description?: string;
};

function getCourseDescription(course: PublicCourseDetailDto | null) {
  if (!course) return undefined;
  const description = extractPlainText(course.description);
  return description || undefined;
}

function getLessonDescription(lesson: PublicLessonDetailDto | null) {
  if (!lesson) return undefined;
  if (lesson.excerpt) return lesson.excerpt;

  const description = extractPlainText(lesson.excerptRich ?? lesson.contentRich);
  return description || undefined;
}

async function getCourseBySlug(slug: string) {
  try {
    return await publicCoursesService.getBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      return null;
    }

    console.error("public.course getBySlug failed", { slug, error });
    throw error;
  }
}

async function getLessonBySlug(courseSlug: string, lessonSlug: string) {
  try {
    return await publicLessonsService.getBySlug(courseSlug, lessonSlug);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      return null;
    }

    console.error("public.lesson getBySlug failed", { courseSlug, lessonSlug, error });
    throw error;
  }
}

async function getPublishedCourseDetails() {
  const courses = await publicCoursesService.listPublishedItems({ page: 1, pageSize: 100 });
  const detailed = await Promise.all(courses.map((course) => getCourseBySlug(course.slug)));

  return detailed.filter((course): course is PublicCourseDetailDto => Boolean(course));
}

export async function getPublicFormazioneIndexData(): Promise<PublicFormazioneIndexData> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_COURSE_PAGE_CACHE_TAG);

  return {
    courses: await getPublishedCourseDetails(),
  };
}

export async function getPublicCoursePageData(slug: string): Promise<PublicCoursePageData> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_COURSE_PAGE_CACHE_TAG);

  const [course, publishedCourses] = await Promise.all([
    getCourseBySlug(slug),
    getPublishedCourseDetails(),
  ]);

  return {
    course,
    publishedCourses,
    description: getCourseDescription(course),
  };
}

export async function getPublicLessonPageData(
  courseSlug: string,
  lessonSlug: string,
): Promise<PublicLessonPageData> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_COURSE_PAGE_CACHE_TAG);

  const [lesson, course] = await Promise.all([
    getLessonBySlug(courseSlug, lessonSlug),
    getCourseBySlug(courseSlug),
  ]);

  if (!lesson || !course) {
    return {
      lesson,
      lessonNumber: null,
      totalLessons: course?.lessons.length ?? 0,
      otherLessons: [],
      previousLesson: null,
      nextLesson: null,
      description: getLessonDescription(lesson),
    };
  }

  const orderedLessons = course.lessons;
  const currentIndex = orderedLessons.findIndex((item) => item.id === lesson.id);
  const previous = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < orderedLessons.length - 1
      ? orderedLessons[currentIndex + 1]
      : null;

  return {
    lesson,
    lessonNumber: currentIndex >= 0 ? currentIndex + 1 : null,
    totalLessons: orderedLessons.length,
    otherLessons: orderedLessons.filter((item) => item.id !== lesson.id),
    previousLesson: previous ? { slug: previous.slug, title: previous.title } : null,
    nextLesson: next ? { slug: next.slug, title: next.title } : null,
    description: getLessonDescription(lesson),
  };
}
