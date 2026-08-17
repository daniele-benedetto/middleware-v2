import { PublicLink } from "@/components/public/public-link";

import type { PublicAnalyticsEventData, PublicAnalyticsEventName } from "@/lib/public/analytics";
import type { ComponentProps } from "react";

type TrackedPublicLinkProps = Omit<ComponentProps<typeof PublicLink>, "onClick"> & {
  analyticsEventName: PublicAnalyticsEventName;
  analyticsEventData?: PublicAnalyticsEventData;
};

export function TrackedPublicLink({
  analyticsEventName,
  analyticsEventData,
  ...props
}: TrackedPublicLinkProps) {
  return (
    <PublicLink
      {...props}
      data-public-analytics-event={analyticsEventName}
      data-public-analytics-data={
        analyticsEventData ? JSON.stringify(analyticsEventData) : undefined
      }
    />
  );
}
