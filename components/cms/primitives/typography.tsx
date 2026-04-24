import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import type { ElementType, ReactNode } from "react";

/* =============================================================
 * DISPLAY (Archivo Black)
 * SG: hero / h1 / h2 / h3 / pull-quote / section-label
 * ============================================================= */

const cmsDisplayVariants = cva("font-display uppercase text-foreground", {
  variants: {
    size: {
      hero: "text-(length:--text-display-hero) leading-(--lh-2xl) tracking-[-0.04em]",
      h1: "text-(length:--text-display-h1) leading-(--lh-display-h1) tracking-[-0.03em]",
      h2: "text-(length:--text-display-h2) leading-(--lh-xl) tracking-[-0.025em]",
      h3: "text-(length:--text-display-h3) leading-(--lh-lg) tracking-[-0.02em]",
      quote:
        "text-(length:--text-display-quote) leading-(--lh-display-quote) tracking-[-0.02em] italic",
      label: "text-(length:--text-display-label) tracking-[0.04em]",
    },
    tone: {
      foreground: "text-foreground",
      accent: "text-accent",
      onAccent: "text-primary-foreground",
    },
  },
  defaultVariants: { size: "h1", tone: "foreground" },
});

type CmsDisplayProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
} & VariantProps<typeof cmsDisplayVariants>;

export function CmsDisplay({ children, className, size, tone, as }: CmsDisplayProps) {
  const Tag = (as ?? defaultTagFor(size)) as ElementType;
  return <Tag className={cn(cmsDisplayVariants({ size, tone }), className)}>{children}</Tag>;
}

function defaultTagFor(size: CmsDisplayProps["size"]): ElementType {
  switch (size) {
    case "hero":
      return "h1";
    case "h1":
      return "h1";
    case "h2":
      return "h2";
    case "h3":
      return "h3";
    case "quote":
      return "blockquote";
    case "label":
      return "p";
    default:
      return "p";
  }
}

/* =============================================================
 * EDITORIAL (Newsreader)
 * SG: body / epigraph / blockquote / hairline / note
 * ============================================================= */

const cmsBodyVariants = cva("font-editorial", {
  variants: {
    size: {
      sm: "text-[16px] leading-(--lh-md)",
      md: "text-[17px] leading-(--lh-editorial)",
      lg: "text-(length:--text-editorial-body) leading-(--lh-lg)",
    },
    tone: {
      foreground: "text-foreground",
      muted: "text-muted-foreground",
      accent: "text-accent",
    },
  },
  defaultVariants: { size: "md", tone: "foreground" },
});

type CmsBodyProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
} & VariantProps<typeof cmsBodyVariants>;

export function CmsBody({ children, className, size, tone, as: Tag = "p" }: CmsBodyProps) {
  return <Tag className={cn(cmsBodyVariants({ size, tone }), className)}>{children}</Tag>;
}

type CmsEpigraphProps = { children: ReactNode; author?: ReactNode; className?: string };

export function CmsEpigraph({ children, author, className }: CmsEpigraphProps) {
  return (
    <p
      className={cn(
        "ml-auto max-w-95 text-right",
        "font-editorial text-(length:--text-editorial-epigraph) leading-(--lh-editorial) italic text-foreground",
        className,
      )}
    >
      {children}
      {author ? (
        <span className="mt-1.5 block font-ui text-(length:--text-meta) not-italic text-muted-foreground">
          {author}
        </span>
      ) : null}
    </p>
  );
}

type CmsBlockquoteProps = { children: ReactNode; source?: ReactNode; className?: string };

export function CmsBlockquote({ children, source, className }: CmsBlockquoteProps) {
  return (
    <blockquote className={cn("max-w-130 border-l-4 border-accent py-1 pl-5", className)}>
      <p className="font-editorial text-(length:--text-editorial-blockquote) leading-(--lh-editorial) italic text-foreground">
        {children}
      </p>
      {source ? (
        <div className="mt-2 font-ui text-(length:--text-meta) text-muted-foreground">{source}</div>
      ) : null}
    </blockquote>
  );
}

type CmsHairlineProps = { children: ReactNode; className?: string };

export function CmsHairline({ children, className }: CmsHairlineProps) {
  return (
    <p
      className={cn(
        "max-w-125 font-editorial italic font-light",
        "text-(length:--text-editorial-hairline) leading-(--lh-md) text-(--ink-70)",
        className,
      )}
    >
      {children}
    </p>
  );
}

type CmsNoteProps = { number: ReactNode; children: ReactNode; className?: string };

export function CmsNote({ number, children, className }: CmsNoteProps) {
  return (
    <div className={cn("flex max-w-140 items-baseline gap-2.5", className)}>
      <span className="shrink-0 font-ui text-(length:--text-meta) text-accent">{number}</span>
      <span className="font-editorial text-(length:--text-editorial-note) leading-(--lh-sm) text-foreground">
        {children}
      </span>
    </div>
  );
}

/* =============================================================
 * META (IBM Plex Mono)
 * SG: category / meta / tagline / paragraph-number / section-number
 * ============================================================= */

const cmsMetaTextVariants = cva("font-ui uppercase", {
  variants: {
    variant: {
      category: "text-(length:--text-meta) tracking-[0.08em] text-accent",
      meta: "text-(length:--text-meta) tracking-normal normal-case text-muted-foreground",
      tagline: "text-(length:--text-meta) tracking-[0.06em] text-foreground",
      tiny: "text-[10px] tracking-[0.08em] text-muted-foreground",
    },
  },
  defaultVariants: { variant: "meta" },
});

type CmsMetaTextProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
} & VariantProps<typeof cmsMetaTextVariants>;

export function CmsMetaText({ children, className, variant, as: Tag = "span" }: CmsMetaTextProps) {
  return <Tag className={cn(cmsMetaTextVariants({ variant }), className)}>{children}</Tag>;
}

type CmsParagraphNumberProps = { children: ReactNode; className?: string };

export function CmsParagraphNumber({ children, className }: CmsParagraphNumberProps) {
  return (
    <span
      className={cn(
        "block pt-0.75 text-right font-ui text-(length:--text-meta) text-(--ink-50)",
        className,
      )}
    >
      {children}
    </span>
  );
}

type CmsSectionNumberProps = {
  number: ReactNode;
  label: ReactNode;
  className?: string;
};

export function CmsSectionNumber({ number, label, className }: CmsSectionNumberProps) {
  return (
    <div className={cn("flex items-baseline gap-2.5", className)}>
      <span className="font-ui text-(length:--text-section-number) text-accent">{number}</span>
      <span className="font-display uppercase text-(length:--text-display-label) tracking-[0.04em] text-foreground">
        {label}
      </span>
    </div>
  );
}

/* =============================================================
 * BACK-COMPAT: CmsEyebrow / CmsHeading / CmsBodyText
 * ============================================================= */

const cmsEyebrowVariants = cva("font-ui text-(length:--text-meta) uppercase tracking-[0.08em]", {
  variants: {
    tone: {
      foreground: "text-foreground",
      accent: "text-accent",
      muted: "text-muted-foreground",
      onAccent: "text-primary-foreground/75",
    },
  },
  defaultVariants: { tone: "foreground" },
});

export const cmsEyebrowClassName = cmsEyebrowVariants({});

type CmsEyebrowProps = {
  children: ReactNode;
  className?: string;
} & VariantProps<typeof cmsEyebrowVariants>;

export function CmsEyebrow({ children, className, tone }: CmsEyebrowProps) {
  return <p className={cn(cmsEyebrowVariants({ tone }), className)}>{children}</p>;
}

const cmsHeadingVariants = cva("font-display uppercase", {
  variants: {
    size: {
      page: "text-(length:--text-display-h1) leading-(--lh-display-h1) tracking-[-0.03em]",
      section: "text-(length:--text-display-h2) leading-(--lh-xl) tracking-[-0.025em]",
    },
    tone: {
      foreground: "text-foreground",
      onAccent: "text-primary-foreground",
    },
  },
  defaultVariants: { size: "page", tone: "foreground" },
});

type CmsHeadingProps = {
  children: ReactNode;
  className?: string;
} & VariantProps<typeof cmsHeadingVariants>;

export function CmsHeading({ children, className, size, tone }: CmsHeadingProps) {
  return <h2 className={cn(cmsHeadingVariants({ size, tone }), className)}>{children}</h2>;
}

const cmsBodyTextVariants = cva("font-editorial", {
  variants: {
    size: {
      md: "text-[16px] leading-(--lh-md)",
      lg: "text-(length:--text-editorial-body) leading-(--lh-lg)",
    },
    tone: {
      foreground: "text-foreground",
      muted: "text-muted-foreground",
      accent: "text-accent",
    },
  },
  defaultVariants: { size: "md", tone: "foreground" },
});

type CmsBodyTextProps = {
  children: ReactNode;
  className?: string;
} & VariantProps<typeof cmsBodyTextVariants>;

export function CmsBodyText({ children, className, size, tone }: CmsBodyTextProps) {
  return <p className={cn(cmsBodyTextVariants({ size, tone }), className)}>{children}</p>;
}
