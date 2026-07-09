"use client";

export const publicAnalyticsEvents = {
  newsletterClick: "newsletter_click",
  outboundLinkClick: "outbound_link_click",
  articleAudioPlay: "article_audio_play",
  mediaDownloadClick: "media_download_click",
  issueArchiveOpen: "issue_archive_open",
} as const;

type PublicAnalyticsEventName = (typeof publicAnalyticsEvents)[keyof typeof publicAnalyticsEvents];

type UmamiWindow = Window & {
  umami?: {
    track: (eventName: string) => void;
  };
};

export function trackPublicAnalyticsEvent(eventName: PublicAnalyticsEventName) {
  if (typeof window === "undefined") {
    return;
  }

  (window as UmamiWindow).umami?.track(eventName);
}
