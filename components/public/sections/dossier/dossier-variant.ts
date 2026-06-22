import type { NarrativeHomeBlock } from "@/components/public/home/home-view-model";

export function getNarrativeVariantClasses(variant: NarrativeHomeBlock["variant"]) {
  switch (variant) {
    case "red":
      return {
        section: "bg-accent text-background",
        eyebrow: "text-[#f4ebdd]/80",
        metaTone: "accent" as const,
        titlePrimary: "text-foreground",
        excerpt: "text-[#f4ebdd]",
        description: "text-[#f4ebdd]/80",
        image: "border-[rgba(244,235,221,0.34)] grayscale",
      };
    case "default":
      return {
        section: "bg-background text-foreground",
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
        excerpt: "text-[#e7ddcb]",
        description: "text-dark-muted",
        image: "border-dark-border grayscale",
      };
  }
}
