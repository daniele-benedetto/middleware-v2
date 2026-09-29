"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CmsActionButton,
  CmsFormField,
  CmsSelect,
  CmsTextInput,
} from "@/components/cms/primitives";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { trpc } from "@/lib/trpc/react";

export function PrintEditionCreateForm() {
  const router = useRouter();
  const [issueId, setIssueId] = useState("");
  const [title, setTitle] = useState("");
  const issuesQuery = trpc.issues.list.useQuery({
    page: 1,
    pageSize: 100,
    query: { sortBy: "publishedAt", sortOrder: "desc" },
  });
  const createMutation = trpc.printEditions.create.useMutation({
    onSuccess: (edition) => router.push(cmsCrudRoutes.printEditions.edit(edition.id)),
  });
  const issues = issuesQuery.data?.items ?? [];
  const selectedIssue = issues.find((issue) => issue.id === issueId);

  return (
    <form
      className="flex max-w-2xl flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!selectedIssue || !title.trim()) return;
        createMutation.mutate({
          issueId: selectedIssue.id,
          title: title.trim(),
          manifest: {
            issueId: selectedIssue.id,
            title: title.trim(),
            issueNumber: "01",
            format: "a4-portrait",
            pageCountMultiple: 4,
            overrides: [],
          },
        });
      }}
    >
      <CmsFormField label="Issue di origine" htmlFor="print-edition-issue" required>
        <CmsSelect
          value={issueId}
          onValueChange={setIssueId}
          placeholder="SELEZIONA UN ISSUE"
          options={issues.map((issue) => ({ value: issue.id, label: issue.title }))}
        />
      </CmsFormField>
      <CmsFormField label="Titolo edizione" htmlFor="print-edition-title" required>
        <CmsTextInput
          id="print-edition-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Numero cartaceo / primavera"
          tone="editorial"
        />
      </CmsFormField>
      {issuesQuery.isError ? (
        <p className="font-ui text-xs font-bold uppercase tracking-[0.08em] text-accent">
          Impossibile caricare gli issue disponibili.
        </p>
      ) : null}
      <CmsActionButton
        type="submit"
        disabled={!selectedIssue || !title.trim() || createMutation.isPending}
        isLoading={createMutation.isPending}
      >
        Crea bozza
      </CmsActionButton>
    </form>
  );
}
