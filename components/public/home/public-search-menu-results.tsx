"use client";

import { AlertCircle, SearchX } from "lucide-react";
import { useEffect, useState } from "react";

import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

export function PublicSearchMenuResults({
  query,
  onNavigate,
}: {
  query: string;
  onNavigate: (href: string) => void;
}) {
  const normalizedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(normalizedQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(normalizedQuery), 300);
    return () => window.clearTimeout(timeoutId);
  }, [normalizedQuery]);

  const hasSearchQuery = normalizedQuery.length >= 2;
  const enabled = debouncedQuery.length >= 2;
  const isDebouncing = hasSearchQuery && normalizedQuery !== debouncedQuery;
  const searchResults = trpc.public.search.search.useQuery(
    { q: debouncedQuery, limit: 10 },
    {
      enabled,
      placeholderData: (previousData) => previousData,
      staleTime: 30_000,
    },
  );
  const suggestions = trpc.public.search.suggestions.useQuery({ limit: 10 }, { staleTime: 30_000 });

  const showSearchResults = hasSearchQuery && (searchResults.data?.items.length ?? 0) > 0;
  const hasSearchError = hasSearchQuery && searchResults.isError && !searchResults.data;
  const hasEmptySearch =
    hasSearchQuery &&
    !isDebouncing &&
    !searchResults.isPlaceholderData &&
    searchResults.data?.total === 0;
  const results =
    hasSearchError || hasEmptySearch
      ? undefined
      : showSearchResults
        ? searchResults.data?.items
        : suggestions.data?.items;
  const isLoadingSearch = hasSearchQuery && (isDebouncing || searchResults.isPending);
  const showEmptyState =
    hasSearchError ||
    hasEmptySearch ||
    (!normalizedQuery && !suggestions.isPending && !results?.length);

  if (showEmptyState) {
    const isError = hasSearchError || (!hasSearchQuery && suggestions.isError);
    const EmptyIcon = isError ? AlertCircle : SearchX;
    const title = isError
      ? i18n.public.home.dossier.searchErrorTitle
      : i18n.public.home.dossier.searchEmptyTitle;
    const message = isError
      ? i18n.public.home.dossier.searchErrorMessage
      : hasSearchQuery
        ? i18n.public.home.dossier.searchEmptyMessage(debouncedQuery)
        : i18n.public.home.dossier.searchNoContentMessage;

    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <EmptyIcon
          className={isError ? "size-16 text-accent" : "size-14 text-muted"}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <div className="max-w-sm">
          <p
            role={isError ? "alert" : "status"}
            className={`font-heading text-[clamp(28px,4vw,44px)] leading-[1] font-bold tracking-[-0.04em] ${isError ? "text-accent" : "text-foreground"}`}
          >
            {title}
          </p>
          <p className="mx-auto mt-4 max-w-[34ch] font-editorial text-(length:--text-md) leading-[1.4] text-body-text">
            {message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {showSearchResults
          ? i18n.public.home.dossier.searchResultsLabel(searchResults.data?.total ?? 0)
          : ""}
      </p>
      <ol aria-busy={isLoadingSearch}>
        {results?.map((result) => (
          <li key={result.id} className="border-b border-foreground last:border-b-0">
            <a
              href={result.href}
              onClick={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }

                event.preventDefault();
                onNavigate(result.href);
              }}
              className="block cursor-pointer py-4 transition-colors duration-(--motion-fast) hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-[-3px]"
            >
              <p className="font-ui text-(length:--text-xs) font-bold tracking-[0.08em] text-accent uppercase">
                {i18n.public.home.dossier.searchTypeLabel(result.type)}
              </p>
              <h3 className="mt-1 font-heading text-(length:--text-lg) leading-[1.1] font-bold tracking-[-0.025em]">
                {result.title}
              </h3>
              {result.snippet ? (
                <p className="mt-2 max-w-full font-editorial text-(length:--text-md) leading-[1.35] text-body-text md:max-w-[75%]">
                  {result.snippet}
                </p>
              ) : null}
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}
