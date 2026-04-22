import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

const cmsEyebrowVariants = cva("font-ui text-[11px] uppercase tracking-[0.08em]", {
  variants: {
    tone: {
      foreground: "text-foreground",
      accent: "text-accent",
      muted: "text-muted-foreground",
      onAccent: "text-primary-foreground/75",
    },
  },
  defaultVariants: {
    tone: "foreground",
  },
});

const cmsHeadingVariants = cva("font-display tracking-[-0.03em]", {
  variants: {
    size: {
      page: "text-[36px] leading-[0.9]",
      section: "text-[24px] leading-[0.9]",
    },
    tone: {
      foreground: "text-foreground",
      onAccent: "text-primary-foreground",
    },
  },
  defaultVariants: {
    size: "page",
    tone: "foreground",
  },
});

const cmsBodyTextVariants = cva("font-editorial", {
  variants: {
    size: {
      md: "text-[16px] leading-[1.55]",
      lg: "text-[19px] leading-[1.67]",
    },
    tone: {
      foreground: "text-foreground",
      muted: "text-muted-foreground",
      accent: "text-accent",
    },
  },
  defaultVariants: {
    size: "md",
    tone: "foreground",
  },
});

export const cmsEyebrowClassName = cmsEyebrowVariants({});

type CmsEyebrowProps = {
  children: ReactNode;
  className?: string;
} & VariantProps<typeof cmsEyebrowVariants>;

export function CmsEyebrow({ children, className, tone }: CmsEyebrowProps) {
  return <p className={cn(cmsEyebrowVariants({ tone }), className)}>{children}</p>;
}

type CmsHeadingProps = {
  children: ReactNode;
  className?: string;
} & VariantProps<typeof cmsHeadingVariants>;

export function CmsHeading({ children, className, size, tone }: CmsHeadingProps) {
  return <h2 className={cn(cmsHeadingVariants({ size, tone }), className)}>{children}</h2>;
}

type CmsBodyTextProps = {
  children: ReactNode;
  className?: string;
} & VariantProps<typeof cmsBodyTextVariants>;

export function CmsBodyText({ children, className, size, tone }: CmsBodyTextProps) {
  return <p className={cn(cmsBodyTextVariants({ size, tone }), className)}>{children}</p>;
}
