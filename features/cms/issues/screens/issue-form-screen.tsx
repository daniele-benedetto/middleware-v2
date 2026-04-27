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
} from "@/features/cms/issues/hooks/use-issue-crud";
import { mapCrudDomainError, useCmsFormNavigation } from "@/features/cms/shared/forms";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

type IssueFormScreenProps = {
  mode: "create" | "edit";
  issueId?: string;
};

export function CmsIssueFormScreen({ mode, issueId }: IssueFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/issues");
  const text = i18n.cms;
  const issueQuery = useIssueById(mode === "edit" ? issueId : undefined);
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
    const resolvedTitle = title || issueQuery.data?.title || "";
    const resolvedSlug = slug || issueQuery.data?.slug || "";
    const resolvedDescription = description || issueQuery.data?.description || "";

    if (!resolvedTitle.trim() || !resolvedSlug.trim()) {
      cmsToast.error("Titolo e slug sono obbligatori.", text.trpcErrors.badRequestTitle);
      return;
    }

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          title: resolvedTitle,
          slug: resolvedSlug,
          description: resolvedDescription || undefined,
        });
        await invalidateAfterCmsMutation(trpcUtils, "issues.create");
        success("Issue creata.");
        return;
      }

      await updateMutation.mutateAsync({
        id: issueId!,
        data: {
          title: resolvedTitle,
          slug: resolvedSlug,
          description: resolvedDescription || undefined,
        },
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
            {mode === "create" ? "Crea" : "Salva"}
          </CmsActionButton>
        </div>
      </div>
    </div>
  );
}
