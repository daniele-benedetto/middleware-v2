import { CmsCourseFormScreen } from "@/features/cms/courses/screens/course-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchCourseById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.quickActions.edit} ${i18n.cms.navigation.courses}`,
  path: "/cms/courses/[id]/edit",
});

type CmsCourseEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CmsCourseEditPage({ params }: CmsCourseEditPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const initialData = await prefetchCmsDetailOrNotFound(() => prefetchCourseById(id));

  return <CmsCourseFormScreen mode="edit" courseId={id} initialData={initialData} />;
}
