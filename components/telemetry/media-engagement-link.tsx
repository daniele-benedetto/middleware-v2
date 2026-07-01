"use client";

import { PublicLink } from "@/components/public/public-link";
import { recordMediaEngagement } from "@/lib/telemetry/client";

import type { ComponentProps } from "react";

type MediaEngagementLinkProps = ComponentProps<typeof PublicLink> & {
  mediaId?: string | null;
};

export function MediaEngagementLink({ mediaId, onClick, ...props }: MediaEngagementLinkProps) {
  return (
    <PublicLink
      {...props}
      onClick={(event) => {
        recordMediaEngagement("media_open", { mediaId: mediaId ?? null });
        onClick?.(event);
      }}
    />
  );
}
