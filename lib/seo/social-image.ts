import { resolveAbsoluteUrl } from "@/lib/seo/url";

const SOCIAL_IMAGE_WIDTH = 1200;
const SOCIAL_IMAGE_QUALITY = 75;

const OPTIMIZABLE_LOCAL_PATHNAMES = ["/api/public/media/blob", "/brand/"] as const;

export const GENERATED_SOCIAL_CARD_SIZE = {
  width: 1200,
  height: 630,
} as const;

export type SocialImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

function isOptimizableLocalPath(value: string): boolean {
  if (!value.startsWith("/")) {
    return false;
  }

  const pathname = value.split("?")[0];
  return OPTIMIZABLE_LOCAL_PATHNAMES.some((allowed) => pathname.startsWith(allowed));
}

export function toOptimizedImageUrl(pathOrUrl: string): string {
  if (!isOptimizableLocalPath(pathOrUrl)) {
    return resolveAbsoluteUrl(pathOrUrl);
  }

  const params = new URLSearchParams({
    url: pathOrUrl,
    w: String(SOCIAL_IMAGE_WIDTH),
    q: String(SOCIAL_IMAGE_QUALITY),
  });

  return resolveAbsoluteUrl(`/_next/image?${params.toString()}`);
}

export function buildGeneratedSocialImage(url: string, alt: string): SocialImage {
  return {
    url,
    width: GENERATED_SOCIAL_CARD_SIZE.width,
    height: GENERATED_SOCIAL_CARD_SIZE.height,
    alt,
  };
}

export function buildEditorialSocialImage(imageUrl: string, alt: string): SocialImage {
  return {
    url: toOptimizedImageUrl(imageUrl),
    alt,
  };
}
