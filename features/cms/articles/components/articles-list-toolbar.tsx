"use client";

import { CmsBulkActionBar } from "@/components/cms/common";
import { CmsSearchSelect, CmsSelect } from "@/components/cms/primitives";
import { CmsListSearchInput } from "@/features/cms/shared/components/cms-list-search-input";
import { i18n } from "@/lib/i18n";

import type { CmsResolvedQuickAction } from "@/features/cms/shared/actions";

type ArticlesListToolbarAction = CmsResolvedQuickAction & {
  onExecute: () => void | Promise<unknown>;
};

type ArticlesListToolbarOption = {
  value: string;
  label: string;
  displayLabel?: string;
};

type ArticlesListToolbarProps = {
  totalRecords: number;
  selectedCount: number;
  bulkActions: ArticlesListToolbarAction[];
  onSelectAll?: () => void;
  selectAllDisabled: boolean;
  searchValue: string;
  statusValue: string;
  featuredValue: string;
  issueIdValue: string;
  categoryIdValue: string;
  authorIdValue: string;
  sortByValue: string;
  sortOrderValue: string;
  issueOptions: ArticlesListToolbarOption[];
  categoryOptions: ArticlesListToolbarOption[];
  authorOptions: ArticlesListToolbarOption[];
  issuesLoading: boolean;
  categoriesLoading: boolean;
  authorsLoading: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onFeaturedChange: (value: string) => void;
  onIssueChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
};

export function ArticlesListToolbar({
  totalRecords,
  selectedCount,
  bulkActions,
  onSelectAll,
  selectAllDisabled,
  searchValue,
  statusValue,
  featuredValue,
  issueIdValue,
  categoryIdValue,
  authorIdValue,
  sortByValue,
  sortOrderValue,
  issueOptions,
  categoryOptions,
  authorOptions,
  issuesLoading,
  categoriesLoading,
  authorsLoading,
  onSearchChange,
  onStatusChange,
  onFeaturedChange,
  onIssueChange,
  onCategoryChange,
  onAuthorChange,
  onSortByChange,
  onSortOrderChange,
}: ArticlesListToolbarProps) {
  const text = i18n.cms;
  const commonText = text.common;
  const listText = text.lists.articles;
  const optionsText = text.listOptions;

  return (
    <div className="space-y-3">
      <div className="font-ui text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
        {commonText.totalRecords(totalRecords)}
      </div>

      <CmsBulkActionBar
        selectedCount={selectedCount}
        actions={bulkActions}
        onSelectAll={onSelectAll}
        selectAllDisabled={selectAllDisabled}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <CmsListSearchInput
          key={searchValue}
          initialValue={searchValue}
          placeholder={text.listToolbar.searchPlaceholder}
          className="col-span-1 lg:col-span-1"
          onSearchChange={onSearchChange}
        />

        <div className="grid col-span-1 grid-cols-3 gap-2 lg:col-span-2">
          <CmsSelect
            value={statusValue}
            onValueChange={onStatusChange}
            options={[
              { value: "all", label: optionsText.statusAllMasculine },
              { value: "DRAFT", label: listText.statusDraft },
              { value: "PUBLISHED", label: listText.statusPublished },
              { value: "ARCHIVED", label: listText.statusArchived },
            ]}
          />

          <CmsSelect
            value={featuredValue}
            onValueChange={onFeaturedChange}
            options={[
              { value: "all", label: optionsText.featuredAll },
              { value: "true", label: optionsText.featuredOnly },
              { value: "false", label: optionsText.notFeaturedOnly },
            ]}
          />

          <CmsSearchSelect
            value={issueIdValue}
            onValueChange={onIssueChange}
            options={issueOptions}
            loading={issuesLoading}
          />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <CmsSearchSelect
          value={categoryIdValue}
          onValueChange={onCategoryChange}
          options={categoryOptions}
          loading={categoriesLoading}
        />

        <CmsSearchSelect
          value={authorIdValue}
          onValueChange={onAuthorChange}
          options={authorOptions}
          loading={authorsLoading}
        />

        <CmsSelect
          value={sortByValue}
          onValueChange={onSortByChange}
          options={[
            { value: "createdAt", label: optionsText.sortCreatedAt },
            { value: "publishedAt", label: optionsText.sortPublishedAt },
            { value: "position", label: optionsText.sortPosition },
          ]}
        />

        <CmsSelect
          value={sortOrderValue}
          onValueChange={onSortOrderChange}
          options={[
            { value: "desc", label: optionsText.desc },
            { value: "asc", label: optionsText.asc },
          ]}
        />
      </div>
    </div>
  );
}
