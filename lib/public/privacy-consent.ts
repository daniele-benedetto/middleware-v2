"use client";

import { useSyncExternalStore } from "react";

export type PrivacyBannerMode = "acknowledge" | "consent";

export type StoredPrivacyDecision = {
  version: string;
  choice: "acknowledged" | "accepted" | "rejected";
  decidedAt: string;
  expiresAt: string;
};

export const privacyConsentCookieName = "mw_cookie_consent";
export const privacyConsentMaxAgeSeconds = 60 * 60 * 24 * 365;
export const privacyConsentChangeEvent = "mw-cookie-consent-change";

export function readPrivacyDecision(): StoredPrivacyDecision | null {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${privacyConsentCookieName}=`));

  if (!cookie) {
    return null;
  }

  try {
    return JSON.parse(
      decodeURIComponent(cookie.split("=").slice(1).join("=")),
    ) as StoredPrivacyDecision;
  } catch {
    return null;
  }
}

export function getValidPrivacyChoice(
  decision: StoredPrivacyDecision | null,
  consentVersion: string,
) {
  if (!decision || decision.version !== consentVersion) {
    return null;
  }

  if (new Date(decision.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return decision.choice;
}

export function writePrivacyDecision(
  consentVersion: string,
  choice: StoredPrivacyDecision["choice"],
) {
  const decidedAt = new Date();
  const expiresAt = new Date(decidedAt.getTime() + privacyConsentMaxAgeSeconds * 1000);
  const value = encodeURIComponent(
    JSON.stringify({
      version: consentVersion,
      choice,
      decidedAt: decidedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    } satisfies StoredPrivacyDecision),
  );
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${privacyConsentCookieName}=${value}; Path=/; Max-Age=${privacyConsentMaxAgeSeconds}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(privacyConsentChangeEvent));
}

function subscribeToPrivacyDecision(callback: () => void) {
  window.addEventListener(privacyConsentChangeEvent, callback);

  return () => {
    window.removeEventListener(privacyConsentChangeEvent, callback);
  };
}

function getServerPrivacyDecisionSnapshot() {
  return "pending" as const;
}

export function usePrivacyChoice(consentVersion: string) {
  return useSyncExternalStore(
    subscribeToPrivacyDecision,
    () => getValidPrivacyChoice(readPrivacyDecision(), consentVersion) ?? "missing",
    getServerPrivacyDecisionSnapshot,
  );
}
