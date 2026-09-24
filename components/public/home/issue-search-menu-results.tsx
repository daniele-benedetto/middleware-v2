"use client";

import { PublicSearchMenuResults } from "@/components/public/home/public-search-menu-results";
import { TrpcProvider } from "@/lib/trpc/provider";

type IssueSearchMenuResultsProps = {
  query: string;
  onNavigate: (href: string) => void;
};

export function IssueSearchMenuResults({ query, onNavigate }: IssueSearchMenuResultsProps) {
  return (
    <TrpcProvider>
      <PublicSearchMenuResults query={query} onNavigate={onNavigate} />
    </TrpcProvider>
  );
}
