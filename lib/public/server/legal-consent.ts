import "server-only";

import { createHash } from "node:crypto";

import { ApiError } from "@/lib/server/http/api-error";
import { publicPagesService } from "@/lib/server/modules/pages/service/public";

const legalPolicySlugs = ["privacy-policy", "cookie-policy"] as const;

export async function getLegalConsentVersion(): Promise<string> {
  const pages = await Promise.all(
    legalPolicySlugs.map(async (slug) => {
      try {
        return await publicPagesService.getBySlug(slug);
      } catch (error) {
        if (error instanceof ApiError && error.code === "NOT_FOUND") return null;
        throw error;
      }
    }),
  );
  const versionSource = pages
    .map((page, index) => `${legalPolicySlugs[index]}:${page?.updatedAt ?? "missing"}`)
    .join("|");

  return createHash("sha256").update(versionSource).digest("hex").slice(0, 16);
}
