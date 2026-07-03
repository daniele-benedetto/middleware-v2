import "server-only";

export type SlugStaticParam = {
  slug: string;
};

export const EMPTY_PUBLIC_STATIC_PARAM_SLUG = "empty-static-param";

export function ensureNonEmptyStaticParams<T extends SlugStaticParam>(params: T[]): T[] {
  if (params.length > 0) {
    return params;
  }

  return [{ slug: EMPTY_PUBLIC_STATIC_PARAM_SLUG } as T];
}
