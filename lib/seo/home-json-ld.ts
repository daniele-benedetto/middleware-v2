import {
  buildIssueCollectionPageJsonLd,
  buildJsonLdGraph,
  buildWebsiteJsonLd,
} from "@/lib/seo/json-ld";

import type { PublicCurrentIssueDetail } from "@/lib/public/types/issues";

export function buildHomeJsonLd(currentIssue: PublicCurrentIssueDetail | null, path = "/") {
  const website = buildWebsiteJsonLd();

  if (!currentIssue) {
    return buildJsonLdGraph([website]);
  }

  return buildJsonLdGraph([website, buildIssueCollectionPageJsonLd(currentIssue, path)]);
}
