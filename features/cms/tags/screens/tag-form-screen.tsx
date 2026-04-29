"use client";

import { CmsTaxonomyFormScreen } from "@/features/cms/shared/taxonomy/taxonomy-form-screen";
import {
  useTagById,
  useTagCreate,
  useTagUpdate,
  type CreateTagInput,
  type TagDetail,
  type UpdateTagInput,
} from "@/features/cms/tags/hooks/use-tag-crud";
import { i18n } from "@/lib/i18n";
import { createTagInputSchema, updateTagInputSchema } from "@/lib/server/modules/tags/schema";

type TagFormScreenProps = {
  mode: "create" | "edit";
  tagId?: string;
  initialData?: TagDetail;
};

export function CmsTagFormScreen({ mode, tagId, initialData }: TagFormScreenProps) {
  const detailQuery = useTagById(mode === "edit" ? tagId : undefined, { initialData });
  const createMutation = useTagCreate();
  const updateMutation = useTagUpdate();

  return (
    <CmsTaxonomyFormScreen<CreateTagInput, UpdateTagInput, TagDetail>
      mode={mode}
      entityId={tagId}
      detailQuery={detailQuery}
      createMutation={createMutation}
      updateMutation={updateMutation}
      createSchema={createTagInputSchema}
      updateSchema={updateTagInputSchema}
      resource="tags"
      resourceText={i18n.cms.forms.resources.tags}
      listPath="/cms/tags"
      createMutationName="tags.create"
      updateMutationName="tags.update"
    />
  );
}
