import { editorialIt } from "@/lib/i18n/it/editorial";
import { publicIt } from "@/lib/i18n/it/public";

/**
 * Public-site subset of `i18n` (same shape, without the CMS dictionary).
 * Public client components import this instead of `@/lib/i18n` so the CMS
 * strings are not shipped in the public JavaScript bundle.
 */
export const i18n = {
  locale: "it",
  editorial: editorialIt,
  public: publicIt,
} as const;
