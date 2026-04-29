import { forbidden } from "next/navigation";

import { CmsUserFormScreen } from "@/features/cms/users/screens/user-form-screen";
import { hasCmsRole, requireCmsSession } from "@/lib/cms/auth";
import {
  prefetchCmsDetailOrNotFound,
  resolveCmsRouteEntityIdOrNotFound,
} from "@/lib/cms/route-handling";
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
  const { id: rawId } = await params;
  const id = resolveCmsRouteEntityIdOrNotFound(rawId);
  const session = await requireCmsSession(`/cms/users/${id}/edit`);

  if (!hasCmsRole(session, "ADMIN")) {
    forbidden();
  }

  const initialData = await prefetchCmsDetailOrNotFound(() => prefetchUserById(id));

  return (
    <CmsUserFormScreen
      mode="edit"
      userId={id}
      initialData={initialData}
      currentUserId={session.user.id}
    />
  );
}
