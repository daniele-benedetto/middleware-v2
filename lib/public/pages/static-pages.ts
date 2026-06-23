export const PUBLIC_STATIC_PAGE_SLUGS = ["chi-siamo", "cookie-policy", "privacy-policy"] as const;

export type PublicStaticPageSlug = (typeof PUBLIC_STATIC_PAGE_SLUGS)[number];

export function isPublicStaticPageSlug(value: string): value is PublicStaticPageSlug {
  return PUBLIC_STATIC_PAGE_SLUGS.includes(value as PublicStaticPageSlug);
}

export function getPublicStaticPagePath(slug: PublicStaticPageSlug): string {
  return `/${slug}`;
}
