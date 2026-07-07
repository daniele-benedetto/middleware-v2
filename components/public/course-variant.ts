import type { CourseHomeVariant } from "@/lib/server/modules/courses/schema";

export type CourseVariantClasses = {
  surface: string;
  backgroundNumber: string;
  title: string;
  titlePrimary: string;
  description: string;
  meta: string;
  separator: string;
  border: string;
  cardBorder: string;
};

export const courseVariantClasses: Record<CourseHomeVariant, CourseVariantClasses> = {
  default: {
    surface: "bg-background text-foreground",
    backgroundNumber: "text-accent/15 [-webkit-text-stroke:0.35px_rgba(0,0,0,0.22)]",
    title: "text-foreground",
    titlePrimary: "text-accent",
    description: "text-body-text",
    meta: "text-muted",
    separator: "bg-accent",
    border: "border-foreground",
    cardBorder: "border border-foreground",
  },
  red: {
    surface: "bg-accent text-background",
    backgroundNumber: "text-foreground/15 [-webkit-text-stroke:0.35px_rgba(255,248,235,0.24)]",
    title: "text-background",
    titlePrimary: "text-foreground",
    description: "text-cream-soft",
    meta: "text-cream-muted",
    separator: "bg-foreground",
    border: "border-foreground",
    cardBorder: "",
  },
  black: {
    surface: "bg-foreground text-background",
    backgroundNumber: "text-accent/20 [-webkit-text-stroke:0.35px_rgba(255,248,235,0.18)]",
    title: "text-background",
    titlePrimary: "text-accent",
    description: "text-cream-warm",
    meta: "text-dark-muted",
    separator: "bg-accent",
    border: "border-dark-border",
    cardBorder: "",
  },
};
