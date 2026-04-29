"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useCategoriesListQuery, useCmsListUrlState } from "@/features/cms/shared/hooks";
import { CmsTaxonomyListScreen } from "@/features/cms/shared/taxonomy/taxonomy-list-screen";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { parseCategoriesListSearchParams } from "@/lib/cms/query";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

import type { CategoriesListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type CategoriesListInput = RouterInputs["categories"]["list"];

type CmsCategoriesListScreenProps = {
  initialInput?: CategoriesListInput;
  initialData?: CategoriesListInitialData;
};

export function CmsCategoriesListScreen({
  initialInput,
  initialData,
}: CmsCategoriesListScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const input = parseCategoriesListSearchParams(searchParams);
  const listQuery = useCategoriesListQuery(input, {
    initialDataInput: initialInput,
    initialData,
  });
  const deleteMutation = trpc.categories.delete.useMutation();

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
      title={text.navigation.categories}
      input={input}
      listQuery={listQuery}
      listText={text.lists.categories}
      emptyTitle={text.resource.emptyTitle(text.navigation.categories)}
      updateSearchParams={updateSearchParams}
      onCreate={() => router.push(cmsCrudRoutes.categories.create)}
      onEdit={(id) => router.push(cmsCrudRoutes.categories.edit(id))}
      deleteMutation={deleteMutation}
      deleteMutationName="categories.delete"
      bulkDeleteDescription={(selectedCount) =>
        selectedCount === 1
          ? text.quickActions.confirmDeleteCategorySingle
          : text.quickActions.confirmDeleteCategoryBulk(selectedCount)
      }
      statusOptions={[
        { value: "all", label: text.listOptions.statusAllFeminine },
        { value: "true", label: text.listOptions.activeOnlyFeminine },
        { value: "false", label: text.listOptions.inactiveOnlyFeminine },
      ]}
      sortOptions={[
        { value: "createdAt", label: text.listOptions.sortCreatedAt },
        { value: "name", label: text.listOptions.sortName },
        { value: "slug", label: text.listOptions.sortSlug },
      ]}
    />
  );
}
