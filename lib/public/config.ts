export const publicFeatures = {
  cookieConsentBanner: true,
} as const;

function optionalPublicEnv(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

export const publicAnalytics = {
  umamiScriptSrc: optionalPublicEnv(process.env.NEXT_PUBLIC_UMAMI_SRC),
  umamiWebsiteId: optionalPublicEnv(process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID),
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
