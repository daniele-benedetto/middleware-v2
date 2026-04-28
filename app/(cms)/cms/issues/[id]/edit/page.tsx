import { CmsIssueFormScreen } from "@/features/cms/issues/screens/issue-form-screen";
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
  const { id } = await params;
  const initialData = await prefetchIssueById(id).catch(() => undefined);
  return <CmsIssueFormScreen mode="edit" issueId={id} initialData={initialData} />;
}
