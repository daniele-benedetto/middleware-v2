import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PublicCoursePage } from "@/components/public/pages";
import { i18n } from "@/lib/i18n";
import { getPublicCoursePageData } from "@/lib/public/server/course-page";
import { buildPageMetadata } from "@/lib/seo";

import type { Metadata } from "next";

type PublicCourseRouteProps = {
  params: Promise<{ courseSlug: string }>;
};

export async function generateMetadata({ params }: PublicCourseRouteProps): Promise<Metadata> {
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

async function PublicCourseRouteContent({ params }: PublicCourseRouteProps) {
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

export default function PublicCourseRoute({ params }: PublicCourseRouteProps) {
  return (
    <Suspense fallback={null}>
      <PublicCourseRouteContent params={params} />
    </Suspense>
  );
}
