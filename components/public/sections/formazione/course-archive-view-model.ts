import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { PublicCourseDto } from "@/lib/server/modules/courses/dto/public";

export type CourseArchiveViewModel = PublicCourseDto & {
  courseNumber: string;
  descriptionPlain: string | null;
};

export function formatCourseNumber(value: number) {
  return String(value).padStart(2, "0");
}

export function getCoursePlainDescription(course: PublicCourseDto) {
  return extractPlainText(course.description) || null;
}

export function getCourseArchiveViewModels(courses: PublicCourseDto[]): CourseArchiveViewModel[] {
  return courses.map((course, index) => ({
    ...course,
    courseNumber: formatCourseNumber(index + 1),
    descriptionPlain: getCoursePlainDescription(course),
  }));
}

export function getCourseNumberLabel(courses: PublicCourseDto[], currentCourseId: string) {
  const index = courses.findIndex((course) => course.id === currentCourseId);
  return formatCourseNumber(index >= 0 ? index + 1 : 0);
}
