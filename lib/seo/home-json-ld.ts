import {
  buildIssueCollectionPageJsonLd,
  buildJsonLdGraph,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
} from "@/lib/seo/json-ld";

import type { PublicCurrentIssueDetail } from "@/lib/public/types/issues";

export function buildHomeJsonLd(currentIssue: PublicCurrentIssueDetail | null, path = "/") {
  const website = buildWebsiteJsonLd();
  const organization = buildOrganizationJsonLd();

  if (!currentIssue) {
    return buildJsonLdGraph([website, organization]);
  }

  return buildJsonLdGraph([
    website,
    organization,
    buildIssueCollectionPageJsonLd(currentIssue, path),
  ]);
}
