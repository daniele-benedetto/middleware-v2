import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";

export type PrintDarkTone = {
  background: string;
  ink: string;
  accent: string;
};

const darkToneByVariant: Record<IssueHomeVariant, PrintDarkTone | null> = {
  black: { background: "#000000", ink: "#ffffff", accent: "#c13814" },
  red: { background: "#c13814", ink: "#ffffff", accent: "#000000" },
  default: null,
};

/** Special openings with a photo take the issue color as full-page background. */
export function resolvePrintDarkTone(variant: IssueHomeVariant): PrintDarkTone | null {
  return darkToneByVariant[variant];
}
