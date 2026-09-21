"use client";

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
    { enabled, staleTime: 30_000 },
  );
  const suggestions = trpc.public.search.suggestions.useQuery(
    { limit: 10 },
    { enabled: !hasSearchQuery, staleTime: 30_000 },
  );
  const activeQuery = hasSearchQuery ? searchResults : suggestions;

  if (!hasSearchQuery && suggestions.isPending) {
    return (
      <p
        role="status"
        className="font-ui text-(length:--text-xs) font-bold tracking-[0.08em] text-muted uppercase"
      >
        {i18n.public.home.dossier.searchLoading}
      </p>
    );
  }

  if (hasSearchQuery && (isDebouncing || searchResults.isPending)) {
    return (
      <p
        role="status"
        className="font-ui text-(length:--text-xs) font-bold tracking-[0.08em] text-muted uppercase"
      >
        {i18n.public.home.dossier.searchLoading}
      </p>
    );
  }

  if (activeQuery.isError && !activeQuery.data) {
    return (
      <p
        role="alert"
        className="font-ui text-(length:--text-xs) font-bold tracking-[0.08em] text-accent uppercase"
      >
        {i18n.public.home.dossier.searchError}
      </p>
    );
  }

  if (hasSearchQuery && searchResults.data?.total === 0) {
    return (
      <p
        role="status"
        className="font-ui text-(length:--text-xs) font-bold tracking-[0.08em] text-muted uppercase"
      >
        {i18n.public.home.dossier.searchEmpty(debouncedQuery)}
      </p>
    );
  }

  const results = hasSearchQuery ? searchResults.data?.items : suggestions.data?.items;
  const label = hasSearchQuery
    ? i18n.public.home.dossier.searchResultsLabel(searchResults.data?.total ?? 0)
    : suggestions.data?.source === "popular"
      ? i18n.public.home.dossier.searchPopularLabel
      : i18n.public.home.dossier.searchLatestLabel;

  return (
    <>
      <p
        role="status"
        aria-live="polite"
        className="mb-3 font-ui text-(length:--text-xs) font-bold tracking-[0.08em] text-muted uppercase"
      >
        {label}
      </p>
      <ol className="border-t border-foreground">
        {results?.map((result) => (
          <li key={result.id} className="border-b border-foreground">
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
