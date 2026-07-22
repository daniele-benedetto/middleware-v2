"use client";

import {
  getAnalyticsHost,
  publicAnalyticsEvents,
  trackPublicAnalyticsEvent,
} from "@/lib/public/analytics";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

type TrackedExternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  source: string;
  children: ReactNode;
};

export function TrackedExternalLink({
  href,
  source,
  onClick,
  children,
  ...props
}: TrackedExternalLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const targetHost = getAnalyticsHost(href);

    trackPublicAnalyticsEvent(publicAnalyticsEvents.outboundLinkClick, {
      source,
      target_host: targetHost && targetHost !== window.location.hostname ? targetHost : null,
    });
    onClick?.(event);
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
