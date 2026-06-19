"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useAuthorsListQuery, useCmsListUrlState } from "@/features/cms/shared/hooks";
import { CmsTaxonomyListScreen } from "@/features/cms/shared/taxonomy/taxonomy-list-screen";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { parseAuthorsListSearchParams } from "@/lib/cms/query";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

import type { AuthorsListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type AuthorsListInput = RouterInputs["authors"]["list"];

type CmsAuthorsListScreenProps = {
  initialInput?: AuthorsListInput;
  initialData?: AuthorsListInitialData;
};

export function CmsAuthorsListScreen({ initialInput, initialData }: CmsAuthorsListScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const input = parseAuthorsListSearchParams(searchParams);
  const listQuery = useAuthorsListQuery(input, {
    initialDataInput: initialInput,
    initialData,
  });
  const deleteMutation = trpc.authors.delete.useMutation();

  const { updateSearchParams } = useCmsListUrlState({
    baseParams: {
      page: input.page,
      pageSize: input.pageSize,
      q: input.query?.q,
      sortBy: input.query?.sortBy,
      sortOrder: input.query?.sortOrder,
      isActive: input.query?.isActive,
    },
  });

  return (
    <CmsTaxonomyListScreen
      title={text.navigation.authors}
      input={input}
      listQuery={listQuery}
      listText={text.lists.authors}
      emptyTitle={text.resource.emptyTitle(text.navigation.authors)}
      updateSearchParams={updateSearchParams}
      onCreate={() => router.push(cmsCrudRoutes.authors.create)}
      onEdit={(id) => router.push(cmsCrudRoutes.authors.edit(id))}
      deleteMutation={deleteMutation}
      deleteMutationName="authors.delete"
      bulkDeleteDescription={(selectedCount) =>
        selectedCount === 1
          ? text.quickActions.confirmDeleteAuthorSingle
          : text.quickActions.confirmDeleteAuthorBulk(selectedCount)
      }
      statusOptions={[
        { value: "all", label: text.listOptions.statusAllMasculine },
        { value: "true", label: text.listOptions.activeOnlyMasculine },
        { value: "false", label: text.listOptions.inactiveOnlyMasculine },
      ]}
      sortOptions={[
        { value: "createdAt", label: text.listOptions.sortCreatedAt },
        { value: "name", label: text.listOptions.sortName },
        { value: "slug", label: text.listOptions.sortSlug },
      ]}
    />
  );
}
