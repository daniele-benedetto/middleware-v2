export const publicFeatures = {
  cookieConsentBanner: true,
} as const;

function optionalPublicEnv(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function optionalPublicBoolean(value: string | undefined, defaultValue = false) {
  const trimmedValue = optionalPublicEnv(value)?.toLowerCase();

  if (!trimmedValue) return defaultValue;

  return ["1", "true", "yes", "on"].includes(trimmedValue);
}

export const publicAnalytics = {
  umamiScriptSrc: optionalPublicEnv(process.env.NEXT_PUBLIC_UMAMI_SRC),
  umamiWebsiteId: optionalPublicEnv(process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID),
  umamiDomains: optionalPublicEnv(process.env.NEXT_PUBLIC_UMAMI_DOMAINS),
  umamiPerformance: optionalPublicBoolean(process.env.NEXT_PUBLIC_UMAMI_PERFORMANCE),
  umamiDoNotTrack: optionalPublicBoolean(process.env.NEXT_PUBLIC_UMAMI_DO_NOT_TRACK, true),
  umamiExcludeSearch: optionalPublicBoolean(process.env.NEXT_PUBLIC_UMAMI_EXCLUDE_SEARCH),
  umamiExcludeHash: optionalPublicBoolean(process.env.NEXT_PUBLIC_UMAMI_EXCLUDE_HASH, true),
} as const;

export const publicPrivacy = {
  bannerMode:
    optionalPublicEnv(process.env.NEXT_PUBLIC_PRIVACY_BANNER_MODE) === "consent"
      ? "consent"
      : "acknowledge",
} as const;

export function isPublicAnalyticsEnabled() {
  return Boolean(publicAnalytics.umamiScriptSrc && publicAnalytics.umamiWebsiteId);
}
