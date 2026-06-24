import { i18n } from "@/lib/i18n";

const LOCAL_FALLBACK_URL = "http://localhost:3000";

function normalizeSiteUrl(rawValue: string | undefined): URL {
  if (!rawValue) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing SITE_URL for production SEO metadata");
    }

    return new URL(LOCAL_FALLBACK_URL);
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing SITE_URL for production SEO metadata");
    }

    return new URL(LOCAL_FALLBACK_URL);
  }

  const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://");
  const candidate = withProtocol ? trimmed : `https://${trimmed}`;

  try {
    return new URL(candidate);
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid SITE_URL for production SEO metadata");
    }

    return new URL(LOCAL_FALLBACK_URL);
  }
}

const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
);

export const seoConfig = {
  siteName: i18n.public.brand.wordmark,
  applicationName: i18n.public.brand.wordmark,
  defaultTitle: "Middleware",
  titleTemplate: `Middleware | %s`,
  defaultDescription:
    "Middleware è un laboratorio di inchiesta a Modena: territorio, conflitto sociale, trasformazioni urbane e politica dal basso.",
  keywords: [
    "Middleware",
    "laboratorio di inchiesta",
    "Modena",
    "territorio",
    "conflitto sociale",
    "trasformazioni urbane",
    "politica dal basso",
    "inchiesta territoriale",
  ],
  locale: "it_IT",
  twitterHandle: "@middleware",
  siteUrl,
} as const;
