export const publicAnalyticsEvents = {
  audioCtaClick: "audio_cta_click",
  audioProgress: "audio_progress",
  audioComplete: "audio_complete",
  audioBookmarkAdd: "audio_bookmark_add",
  contentCardClick: "content_card_click",
  courseArchiveOpen: "course_archive_open",
  menuOpen: "menu_open",
  menuNavigate: "menu_navigate",
  newsletterClick: "newsletter_click",
  outboundLinkClick: "outbound_link_click",
  articleAudioPlay: "article_audio_play",
  mediaDownloadClick: "media_download_click",
  issueArchiveOpen: "issue_archive_open",
} as const;

export type PublicAnalyticsEventName =
  (typeof publicAnalyticsEvents)[keyof typeof publicAnalyticsEvents];

type PublicAnalyticsEventValue = string | number | boolean | null;

export type PublicAnalyticsEventData = Record<string, PublicAnalyticsEventValue>;

export function getAnalyticsHost(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function getAudioDurationBucket(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return "unknown";
  if (durationSeconds < 10 * 60) return "short";
  if (durationSeconds < 30 * 60) return "medium";
  return "long";
}

export function getAudioPositionBucket(positionSeconds: number, durationSeconds: number) {
  if (!Number.isFinite(positionSeconds) || positionSeconds < 0) return "unknown";
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return "unknown";

  const percentage = (positionSeconds / durationSeconds) * 100;

  if (percentage < 25) return "0_24";
  if (percentage < 50) return "25_49";
  if (percentage < 75) return "50_74";
  return "75_100";
}

type UmamiWindow = Window & {
  umami?: {
    track: (eventName: string, eventData?: PublicAnalyticsEventData) => void;
  };
};

export function trackPublicAnalyticsEvent(
  eventName: PublicAnalyticsEventName,
  eventData?: PublicAnalyticsEventData,
) {
  if (typeof window === "undefined") {
    return;
  }

  (window as UmamiWindow).umami?.track(eventName, eventData);
}
