import { CmsIssueFormScreen } from "@/features/cms/issues/screens/issue-form-screen";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
import { prefetchIssueById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.quickActions.edit} ${i18n.cms.navigation.issues}`,
  path: "/cms/issues/[id]/edit",
});

type CmsIssueEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CmsIssueEditPage({ params }: CmsIssueEditPageProps) {
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const initialData = await prefetchCmsDetailOrNotFound(() => prefetchIssueById(id));

  return <CmsIssueFormScreen mode="edit" issueId={id} initialData={initialData} />;
}
