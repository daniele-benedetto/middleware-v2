"use client";

import { keepPreviousData } from "@tanstack/react-query";
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

  const enabled = debouncedQuery.length >= 2;
  const isDebouncing = normalizedQuery.length >= 2 && normalizedQuery !== debouncedQuery;
  const searchResults = trpc.public.search.search.useQuery(
    { q: debouncedQuery, limit: 12 },
    { enabled, placeholderData: keepPreviousData, staleTime: 30_000 },
  );

  if (normalizedQuery.length < 2) {
    return (
      <p className="font-ui text-(length:--text-xs) font-bold tracking-[0.08em] text-muted uppercase">
        {i18n.public.home.dossier.searchHint}
      </p>
    );
  }

  if ((isDebouncing || searchResults.isPending) && !searchResults.data) {
    return (
      <p className="font-ui text-(length:--text-xs) font-bold tracking-[0.08em] text-muted uppercase">
        {i18n.public.home.dossier.searchLoading}
      </p>
    );
  }

  if (searchResults.isError && !searchResults.data) {
    return (
      <p className="font-ui text-(length:--text-xs) font-bold tracking-[0.08em] text-accent uppercase">
        {i18n.public.home.dossier.searchError}
      </p>
    );
  }

  if (searchResults.data?.total === 0) {
    return (
      <p className="font-ui text-(length:--text-xs) font-bold tracking-[0.08em] text-muted uppercase">
        {i18n.public.home.dossier.searchEmpty(debouncedQuery)}
      </p>
    );
  }

  return (
    <>
      <p className="mb-3 font-ui text-(length:--text-xs) font-bold tracking-[0.08em] text-muted uppercase">
        {i18n.public.home.dossier.searchResultsLabel(searchResults.data?.total ?? 0)}
      </p>
      <ol className="border-t border-foreground">
        {searchResults.data?.items.map((result) => (
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
