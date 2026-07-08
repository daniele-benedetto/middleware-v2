import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PublicCoursePage } from "@/components/public/pages";
import { i18n } from "@/lib/i18n";
import { getPublicCoursePageData } from "@/lib/public/server/course-page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicCourseRouteProps = {
  params: Promise<{ courseSlug: string }>;
};

export async function generateMetadata({ params }: PublicCourseRouteProps): Promise<Metadata> {
  await connection();
  const { courseSlug } = await params;
  const { course, description } = await getPublicCoursePageData(courseSlug);

  if (!course) {
    return buildPageMetadata({
      title: i18n.public.metadata.courseNotFound,
      path: `/contro-formazione/${courseSlug}`,
      index: false,
    });
  }

  return buildPageMetadata({
    title: course.title,
    description,
    path: `/contro-formazione/${course.slug}`,
  });
}

export default async function PublicCourseRoute({ params }: PublicCourseRouteProps) {
  await connection();
  const { courseSlug } = await params;
  const { course, publishedCourses, description } = await getPublicCoursePageData(courseSlug);

  if (!course) {
    notFound();
  }

  return (
    <PublicCoursePage
      course={course}
      publishedCourses={publishedCourses}
      description={description}
    />
  );
}
