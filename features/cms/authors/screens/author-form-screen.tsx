"use client";

import {
  useAuthorById,
  useAuthorCreate,
  useAuthorUpdate,
  type AuthorDetail,
  type CreateAuthorInput,
  type UpdateAuthorInput,
} from "@/features/cms/authors/hooks/use-author-crud";
import { CmsTaxonomyFormScreen } from "@/features/cms/shared/taxonomy/taxonomy-form-screen";
import { i18n } from "@/lib/i18n";
import {
  createAuthorInputSchema,
  updateAuthorInputSchema,
} from "@/lib/server/modules/authors/schema";

type AuthorFormScreenProps = {
  mode: "create" | "edit";
  authorId?: string;
  initialData?: AuthorDetail;
};

export function CmsAuthorFormScreen({ mode, authorId, initialData }: AuthorFormScreenProps) {
  const detailQuery = useAuthorById(mode === "edit" ? authorId : undefined, {
    initialData,
  });
  const createMutation = useAuthorCreate();
  const updateMutation = useAuthorUpdate();

  return (
    <CmsTaxonomyFormScreen<CreateAuthorInput, UpdateAuthorInput, AuthorDetail>
      mode={mode}
      entityId={authorId}
      detailQuery={detailQuery}
      createMutation={createMutation}
      updateMutation={updateMutation}
      createSchema={createAuthorInputSchema}
      updateSchema={updateAuthorInputSchema}
      resource="authors"
      richTextField="bioRich"
      resourceText={i18n.cms.forms.resources.authors}
      listPath="/cms/authors"
      createMutationName="authors.create"
      updateMutationName="authors.update"
    />
  );
}
