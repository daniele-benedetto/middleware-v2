import { cva, type VariantProps } from "class-variance-authority";

import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

/**
 * Cover — 3/4 aspect, 6 SG variants driven by `tone`.
 * Archivo drives display/UI; Spectral italic is reserved for the tagline.
 *
 * Sizing: SG dimensions assume ~200px wide preview cards. Pass `className` to
 * resize; internal typography is fixed at SG values.
 */

const coverVariants = cva(
  "relative flex aspect-[3/4] flex-col overflow-hidden px-2.75 pt-3.25 pb-2.5",
  {
    variants: {
      tone: {
        "cream-ink": "border border-(color:--line-subtle) bg-(--bg-main)",
        "cream-accent": "border border-(color:--line-subtle) bg-(--bg-main)",
        "ink-cream": "bg-foreground",
        "accent-white": "bg-accent",
        "accent-white-minimal": "bg-accent",
        "cream-proto": "border border-(color:--line-subtle) bg-(--bg-main)",
      },
    },
    defaultVariants: { tone: "cream-ink" },
  },
);

type CoverTone = NonNullable<VariantProps<typeof coverVariants>["tone"]>;

type TonePalette = {
  mw: string;
  meta: string;
  rule: string;
  title: string;
  tagline: string;
  foot: string;
};

const palettes: Record<CoverTone, TonePalette> = {
  "cream-ink": {
    mw: "text-foreground",
    meta: "text-(--ink-50)",
    rule: "bg-foreground",
    title: "text-foreground",
    tagline: "text-accent",
    foot: "text-accent",
  },
  "cream-accent": {
    mw: "text-accent",
    meta: "text-(--ink-50)",
    rule: "bg-accent",
    title: "text-accent",
    tagline: "text-accent",
    foot: "text-accent",
  },
  "ink-cream": {
    mw: "text-(--bg-main)",
    meta: "text-background/50",
    rule: "bg-(--bg-main)",
    title: "text-(--bg-main)",
    tagline: "text-accent",
    foot: "text-background/40",
  },
  "accent-white": {
    mw: "text-background",
    meta: "text-background/60",
    rule: "bg-background",
    title: "text-background",
    tagline: "text-background/85",
    foot: "text-background/50",
  },
  "accent-white-minimal": {
    mw: "text-background",
    meta: "text-background/60",
    rule: "bg-background",
    title: "text-background",
    tagline: "text-background/85",
    foot: "text-background/50",
  },
  "cream-proto": {
    mw: "text-foreground",
    meta: "text-(--ink-50)",
    rule: "bg-foreground",
    title: "text-foreground",
    tagline: "text-accent",
    foot: "text-accent",
  },
};

type EditorialCoverProps = {
  issueNumber: string;
  season: string;
  title: ReactNode;
  tagline?: string;
  footer?: string;
  tone?: CoverTone;
  photoSlot?: ReactNode;
  className?: string;
};

export function EditorialCover({
  issueNumber,
  season,
  title,
  tagline,
  footer,
  tone = "cream-ink",
  photoSlot,
  className,
}: EditorialCoverProps) {
  const text = i18n.editorial.cover;
  const palette = palettes[tone];
  const resolvedFooter = footer ?? text.defaultFooter;

  return (
    <article className={cn(coverVariants({ tone }), className)}>
      <div className="flex shrink-0 items-start justify-between">
        <span
          className={cn("font-display text-[11px] font-extrabold tracking-[-0.02em]", palette.mw)}
        >
          {text.brandName}
        </span>
        <div
          className={cn("text-right font-ui text-[7px] font-semibold leading-normal", palette.meta)}
        >
          <div>{issueNumber}</div>
          <div>{season}</div>
        </div>
      </div>

      <div className={cn("mt-1.5 mb-2 h-0.5 shrink-0", palette.rule)} />

      <h2
        className={cn(
          "shrink-0 font-display text-[17px] font-black leading-[0.95] tracking-[-0.03em]",
          palette.title,
        )}
      >
        {title}
      </h2>

      <div className="min-h-1.5 flex-1" />

      {tagline ? (
        <p
          className={cn(
            "mb-1.5 shrink-0 font-editorial text-[7.5px] italic font-light leading-[1.35]",
            palette.tagline,
          )}
        >
          {tagline}
        </p>
      ) : null}

      {photoSlot ? <div className="mb-1.75 shrink-0">{photoSlot}</div> : null}

      <div
        className={cn(
          "shrink-0 font-ui text-[6px] font-bold uppercase tracking-[0.08em]",
          palette.foot,
        )}
      >
        {resolvedFooter}
      </div>
    </article>
  );
}
