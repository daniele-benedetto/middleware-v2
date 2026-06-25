import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";

export function getNarrativeVariantClasses(variant: IssueHomeVariant) {
  switch (variant) {
    case "red":
      return {
        section: "bg-accent text-background",
        eyebrow: "text-cream-muted",
        metaTone: "accent" as const,
        titlePrimary: "text-foreground",
        excerpt: "text-cream-soft",
        description: "text-cream-muted",
        image: "border-cream-border-muted grayscale",
      };
    case "default":
      return {
        section: "border-y border-foreground bg-background text-foreground",
        eyebrow: "text-muted",
        metaTone: "light" as const,
        titlePrimary: "text-accent",
        excerpt: "text-body-text",
        description: "text-muted",
        image: "border-foreground grayscale",
      };
    case "black":
      return {
        section: "bg-foreground text-background",
        eyebrow: "text-dark-muted",
        metaTone: "dark" as const,
        titlePrimary: "text-accent",
        excerpt: "text-cream-warm",
        description: "text-dark-muted",
        image: "border-dark-border grayscale",
      };
    default: {
      const exhaustiveCheck: never = variant;
      throw new Error(`Unhandled narrative variant: ${String(exhaustiveCheck)}`);
    }
  }
}
