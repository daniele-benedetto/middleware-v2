"use client";

import { PublicLink } from "@/components/public/public-link";
import { trackPublicAnalyticsEvent } from "@/lib/public/analytics";

import type { PublicAnalyticsEventData, PublicAnalyticsEventName } from "@/lib/public/analytics";
import type { ComponentProps, MouseEvent } from "react";

type TrackedPublicLinkProps = ComponentProps<typeof PublicLink> & {
  analyticsEventName: PublicAnalyticsEventName;
  analyticsEventData?: PublicAnalyticsEventData;
};

export function TrackedPublicLink({
  analyticsEventName,
  analyticsEventData,
  onClick,
  ...props
}: TrackedPublicLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    trackPublicAnalyticsEvent(analyticsEventName, analyticsEventData);
    onClick?.(event);
  };

  return <PublicLink {...props} onClick={handleClick} />;
}
