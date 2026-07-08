"use client";

import { useState } from "react";

import { CmsBulkActionBar } from "@/components/cms/common";
import { CmsSearchSelect, CmsSelect } from "@/components/cms/primitives";
import { CmsListFiltersSheet } from "@/features/cms/shared/components/cms-list-filters-sheet";
import { CmsListSearchInput } from "@/features/cms/shared/components/cms-list-search-input";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
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

type ArticlesListToolbarFiltersState = {
  statusValue: string;
  issueIdValue: string;
  categoryIdValue: string;
  authorIdValue: string;
  sortByValue: string;
  sortOrderValue: string;
};

const defaultArticlesListToolbarFilters: ArticlesListToolbarFiltersState = {
  statusValue: "all",
  issueIdValue: "all",
  categoryIdValue: "all",
  authorIdValue: "all",
  sortByValue: "createdAt",
  sortOrderValue: "desc",
};

type ArticlesListToolbarProps = {
  totalRecords: number;
  selectedCount: number;
  bulkActions: ArticlesListToolbarAction[];
  searchValue: string;
  statusValue: string;
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
  onApplyFilters: (filters: ArticlesListToolbarFiltersState) => void;
};

function buildArticlesListToolbarFiltersState({
  statusValue,
  issueIdValue,
  categoryIdValue,
  authorIdValue,
  sortByValue,
  sortOrderValue,
}: ArticlesListToolbarFiltersState): ArticlesListToolbarFiltersState {
  return {
    statusValue,
    issueIdValue,
    categoryIdValue,
    authorIdValue,
    sortByValue,
    sortOrderValue,
  };
}

function countActiveArticlesListFilters(filters: ArticlesListToolbarFiltersState) {
  return [
    filters.statusValue !== defaultArticlesListToolbarFilters.statusValue,
    filters.issueIdValue !== defaultArticlesListToolbarFilters.issueIdValue,
    filters.categoryIdValue !== defaultArticlesListToolbarFilters.categoryIdValue,
    filters.authorIdValue !== defaultArticlesListToolbarFilters.authorIdValue,
    filters.sortByValue !== defaultArticlesListToolbarFilters.sortByValue,
    filters.sortOrderValue !== defaultArticlesListToolbarFilters.sortOrderValue,
  ].filter(Boolean).length;
}

type ArticlesListToolbarFieldsProps = {
  filters: ArticlesListToolbarFiltersState;
  issueOptions: ArticlesListToolbarOption[];
  categoryOptions: ArticlesListToolbarOption[];
  authorOptions: ArticlesListToolbarOption[];
  issuesLoading: boolean;
  categoriesLoading: boolean;
  authorsLoading: boolean;
  onStatusChange: (value: string) => void;
  onIssueChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onSortByChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
};

function ArticlesListToolbarFields({
  filters,
  issueOptions,
  categoryOptions,
  authorOptions,
  issuesLoading,
  categoriesLoading,
  authorsLoading,
  onStatusChange,
  onIssueChange,
  onCategoryChange,
  onAuthorChange,
  onSortByChange,
  onSortOrderChange,
}: ArticlesListToolbarFieldsProps) {
  const text = i18n.cms;
  const listText = text.lists.articles;
  const optionsText = text.listOptions;

  const statusField = (
    <CmsSelect
      value={filters.statusValue}
      onValueChange={onStatusChange}
      options={[
        { value: "all", label: optionsText.statusAllMasculine },
        { value: "DRAFT", label: listText.statusDraft },
        { value: "PUBLISHED", label: listText.statusPublished },
        { value: "ARCHIVED", label: listText.statusArchived },
      ]}
    />
  );

  const issueField = (
    <CmsSearchSelect
      value={filters.issueIdValue}
      onValueChange={onIssueChange}
      options={issueOptions}
      loading={issuesLoading}
    />
  );

  const categoryField = (
    <CmsSearchSelect
      value={filters.categoryIdValue}
      onValueChange={onCategoryChange}
      options={categoryOptions}
      loading={categoriesLoading}
    />
  );

  const authorField = (
    <CmsSearchSelect
      value={filters.authorIdValue}
      onValueChange={onAuthorChange}
      options={authorOptions}
      loading={authorsLoading}
    />
  );

  const sortByField = (
    <CmsSelect
      value={filters.sortByValue}
      onValueChange={onSortByChange}
      options={[
        { value: "createdAt", label: optionsText.sortCreatedAt },
        { value: "publishedAt", label: optionsText.sortPublishedAt },
      ]}
    />
  );

  const sortOrderField = (
    <CmsSelect
      value={filters.sortOrderValue}
      onValueChange={onSortOrderChange}
      options={[
        { value: "desc", label: optionsText.desc },
        { value: "asc", label: optionsText.asc },
      ]}
    />
  );

  return (
    <>
      {statusField}
      {issueField}
      {categoryField}
      {authorField}
      {sortByField}
      {sortOrderField}
    </>
  );
}

export function ArticlesListToolbar({
  totalRecords,
  selectedCount,
  bulkActions,
  searchValue,
  statusValue,
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
  onApplyFilters,
}: ArticlesListToolbarProps) {
  const text = i18n.cms;
  const commonText = text.common;
  const currentFilters = buildArticlesListToolbarFiltersState({
    statusValue,
    issueIdValue,
    categoryIdValue,
    authorIdValue,
    sortByValue,
    sortOrderValue,
  });
  const [draftFilters, setDraftFilters] = useState(currentFilters);
  const activeFiltersCount = countActiveArticlesListFilters(currentFilters);

  return (
    <div className="space-y-3">
      <div className={cmsMetaLabelClass}>{commonText.totalRecords(totalRecords)}</div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <CmsListSearchInput
          initialValue={searchValue}
          placeholder={text.listToolbar.searchPlaceholder}
          onSearchChange={onSearchChange}
        />

        <CmsBulkActionBar
          selectedCount={selectedCount}
          actions={bulkActions}
          className="md:justify-self-end"
        />

        <CmsListFiltersSheet
          activeFiltersCount={activeFiltersCount}
          className="md:w-36"
          onOpenChange={(open) => {
            if (open) {
              setDraftFilters(currentFilters);
            }
          }}
          onApply={() => {
            onApplyFilters(draftFilters);
          }}
          onClear={() => {
            setDraftFilters(defaultArticlesListToolbarFilters);
          }}
        >
          <ArticlesListToolbarFields
            filters={draftFilters}
            issueOptions={issueOptions}
            categoryOptions={categoryOptions}
            authorOptions={authorOptions}
            issuesLoading={issuesLoading}
            categoriesLoading={categoriesLoading}
            authorsLoading={authorsLoading}
            onStatusChange={(value) => {
              setDraftFilters((current) => ({ ...current, statusValue: value }));
            }}
            onIssueChange={(value) => {
              setDraftFilters((current) => ({ ...current, issueIdValue: value }));
            }}
            onCategoryChange={(value) => {
              setDraftFilters((current) => ({ ...current, categoryIdValue: value }));
            }}
            onAuthorChange={(value) => {
              setDraftFilters((current) => ({ ...current, authorIdValue: value }));
            }}
            onSortByChange={(value) => {
              setDraftFilters((current) => ({ ...current, sortByValue: value }));
            }}
            onSortOrderChange={(value) => {
              setDraftFilters((current) => ({ ...current, sortOrderValue: value }));
            }}
          />
        </CmsListFiltersSheet>
      </div>
    </div>
  );
}
