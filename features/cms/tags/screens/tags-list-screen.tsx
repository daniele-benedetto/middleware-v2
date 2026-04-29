"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useCmsListUrlState, useTagsListQuery } from "@/features/cms/shared/hooks";
import { CmsTaxonomyListScreen } from "@/features/cms/shared/taxonomy/taxonomy-list-screen";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { parseTagsListSearchParams } from "@/lib/cms/query";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

import type { TagsListInitialData } from "@/features/cms/shared/types/initial-data";
import type { RouterInputs } from "@/lib/trpc/types";

type TagsListInput = RouterInputs["tags"]["list"];

type CmsTagsListScreenProps = {
  initialInput?: TagsListInput;
  initialData?: TagsListInitialData;
};

export function CmsTagsListScreen({ initialInput, initialData }: CmsTagsListScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const text = i18n.cms;
  const input = parseTagsListSearchParams(searchParams);
  const listQuery = useTagsListQuery(input, { initialDataInput: initialInput, initialData });
  const deleteMutation = trpc.tags.delete.useMutation();

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
      title={text.navigation.tags}
      input={input}
      listQuery={listQuery}
      listText={text.lists.tags}
      emptyTitle={text.resource.emptyTitle(text.navigation.tags)}
      updateSearchParams={updateSearchParams}
      onCreate={() => router.push(cmsCrudRoutes.tags.create)}
      onEdit={(id) => router.push(cmsCrudRoutes.tags.edit(id))}
      deleteMutation={deleteMutation}
      deleteMutationName="tags.delete"
      bulkDeleteDescription={(selectedCount) =>
        selectedCount === 1
          ? text.quickActions.confirmDeleteTagSingle
          : text.quickActions.confirmDeleteTagBulk(selectedCount)
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
