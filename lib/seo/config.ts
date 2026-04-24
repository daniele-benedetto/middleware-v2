import { i18n } from "@/lib/i18n";

const LOCAL_FALLBACK_URL = "http://localhost:3000";

function normalizeSiteUrl(rawValue: string | undefined): URL {
  if (!rawValue) {
    return new URL(LOCAL_FALLBACK_URL);
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return new URL(LOCAL_FALLBACK_URL);
  }

  const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://");
  const candidate = withProtocol ? trimmed : `https://${trimmed}`;

  try {
    return new URL(candidate);
  } catch {
    return new URL(LOCAL_FALLBACK_URL);
  }
}

const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
);

export const seoConfig = {
  siteName: i18n.cms.brand.wordmark,
  applicationName: i18n.cms.app.metadataTitle,
  defaultTitle: i18n.cms.app.metadataTitle,
  titleTemplate: `%s | ${i18n.cms.brand.wordmark}`,
  defaultDescription: i18n.cms.app.metadataDescription,
  locale: "it_IT",
  twitterHandle: "@middleware",
  siteUrl,
} as const;
