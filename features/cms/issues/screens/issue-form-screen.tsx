"use client";

import { useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsFormField,
  CmsPageHeader,
  CmsTextInput,
  CmsTextarea,
  cmsToast,
} from "@/components/cms/primitives";
import {
  useIssueById,
  useIssueCreate,
  useIssueUpdate,
  type IssueDetail,
} from "@/features/cms/issues/hooks/use-issue-crud";
import {
  mapCrudDomainError,
  useCmsFormNavigation,
  validateFormInput,
} from "@/features/cms/shared/forms";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { createIssueInputSchema, updateIssueInputSchema } from "@/lib/server/modules/issues/schema";
import { trpc } from "@/lib/trpc/react";

const issueFieldLabels = {
  title: "Titolo",
  slug: "Slug",
  description: "Descrizione",
};

type IssueFormScreenProps = {
  mode: "create" | "edit";
  issueId?: string;
  initialData?: IssueDetail;
};

export function CmsIssueFormScreen({ mode, issueId, initialData }: IssueFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/issues");
  const text = i18n.cms;
  const issueQuery = useIssueById(mode === "edit" ? issueId : undefined, { initialData });
  const createMutation = useIssueCreate();
  const updateMutation = useIssueUpdate();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  if (mode === "edit" && !issueId) {
    return <CmsErrorState title="Issue non valida" description="ID mancante per la modifica." />;
  }

  if (mode === "edit" && issueQuery.isPending) {
    return <CmsLoadingState />;
  }

  if (mode === "edit" && issueQuery.isError) {
    const mapped = mapCrudDomainError(issueQuery.error, "issues");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    const payload = {
      title: title || issueQuery.data?.title || "",
      slug: slug || issueQuery.data?.slug || "",
      description: description || issueQuery.data?.description || "" || undefined,
    };

    try {
      if (mode === "create") {
        const validation = validateFormInput(createIssueInputSchema, payload, issueFieldLabels);

        if (!validation.ok) {
          cmsToast.error(validation.message, text.trpcErrors.badRequestTitle);
          return;
        }

        await createMutation.mutateAsync(validation.value);
        await invalidateAfterCmsMutation(trpcUtils, "issues.create");
        success("Issue creata.");
        return;
      }

      const validation = validateFormInput(updateIssueInputSchema, payload, issueFieldLabels);

      if (!validation.ok) {
        cmsToast.error(validation.message, text.trpcErrors.badRequestTitle);
        return;
      }

      await updateMutation.mutateAsync({
        id: issueId!,
        data: validation.value,
      });
      await invalidateAfterCmsMutation(trpcUtils, "issues.update", { id: issueId });
      success("Issue aggiornata.");
    } catch (error) {
      const mapped = mapCrudDomainError(error, "issues");
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader title={mode === "create" ? "Nuova Issue" : "Modifica Issue"} />

      <div className="space-y-4 border border-foreground p-4">
        <CmsFormField label="Titolo" htmlFor="issue-title" required>
          <CmsTextInput
            id="issue-title"
            value={title || issueQuery.data?.title || ""}
            onChange={(event) => setTitle(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Slug" htmlFor="issue-slug" required>
          <CmsTextInput
            id="issue-slug"
            value={slug || issueQuery.data?.slug || ""}
            onChange={(event) => setSlug(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Descrizione" htmlFor="issue-description">
          <CmsTextarea
            id="issue-description"
            value={description || issueQuery.data?.description || ""}
            onChange={(event) => setDescription(event.target.value)}
          />
        </CmsFormField>

        <div className="flex items-center gap-2">
          <CmsActionButton variant="outline" onClick={cancel} disabled={isPending}>
            {text.common.cancel}
          </CmsActionButton>
          <CmsActionButton onClick={() => void handleSubmit()} isLoading={isPending}>
            {mode === "create" ? text.forms.create : text.forms.save}
          </CmsActionButton>
        </div>
      </div>
    </div>
  );
}
