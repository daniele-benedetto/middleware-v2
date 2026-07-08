import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { PublicCourseDetailDto } from "@/lib/server/modules/courses/dto/public";

export type CourseArchiveViewModel = PublicCourseDetailDto & {
  courseNumber: string;
  descriptionPlain: string | null;
};

export function formatCourseNumber(value: number) {
  return String(value).padStart(2, "0");
}

export function getCoursePlainDescription(course: PublicCourseDetailDto) {
  return extractPlainText(course.description) || null;
}

export function getCourseArchiveViewModels(
  courses: PublicCourseDetailDto[],
): CourseArchiveViewModel[] {
  return courses.map((course, index) => ({
    ...course,
    courseNumber: formatCourseNumber(index + 1),
    descriptionPlain: getCoursePlainDescription(course),
  }));
}

export function getCourseNumberLabel(courses: PublicCourseDetailDto[], currentCourseId: string) {
  const index = courses.findIndex((course) => course.id === currentCourseId);
  return formatCourseNumber(index >= 0 ? index + 1 : 0);
}
