import { CmsForbiddenState } from "@/components/cms/common";
import { CmsUserFormScreen } from "@/features/cms/users/screens/user-form-screen";
import { hasCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { prefetchUserById } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: `${i18n.cms.quickActions.edit} ${i18n.cms.navigation.users}`,
  path: "/cms/users/[id]/edit",
});

type CmsUserEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CmsUserEditPage({ params }: CmsUserEditPageProps) {
  const { id } = await params;
  const session = await requireCmsSession(`/cms/users/${id}/edit`);

  if (!hasCmsRole(session, "ADMIN")) {
    return <CmsForbiddenState />;
  }

  const initialData = await prefetchUserById(id).catch(() => undefined);

  return <CmsUserFormScreen mode="edit" userId={id} initialData={initialData} />;
}
