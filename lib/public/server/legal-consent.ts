import "server-only";

import { createHash } from "node:crypto";

import { getPublicStaticPageData } from "@/lib/public/server/page";

const legalPolicySlugs = ["privacy-policy", "cookie-policy"] as const;

export async function getLegalConsentVersion(): Promise<string> {
  const pages = await Promise.all(legalPolicySlugs.map((slug) => getPublicStaticPageData(slug)));
  const versionSource = pages
    .map(({ page }, index) => `${legalPolicySlugs[index]}:${page?.updatedAt ?? "missing"}`)
    .join("|");

  return createHash("sha256").update(versionSource).digest("hex").slice(0, 16);
}
