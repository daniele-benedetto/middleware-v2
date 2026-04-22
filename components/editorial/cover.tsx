import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

/**
 * Cover — 3/4 aspect, 6 SG variants driven by `tone`.
 * Only Archivo Black + IBM Plex Mono; Newsreader italic only for optional tagline.
 *
 * Sizing: SG dimensions assume ~200px wide preview cards. Pass `className` to
 * resize; internal typography is fixed at SG values.
 */

const coverVariants = cva(
  "relative flex aspect-[3/4] flex-col overflow-hidden px-2.75 pt-3.25 pb-2.5",
  {
    variants: {
      tone: {
        "cream-ink": "bg-[color:var(--bg-main)] border border-[rgba(10,10,10,0.1)]",
        "cream-accent": "bg-[color:var(--bg-main)] border border-[rgba(10,10,10,0.1)]",
        "ink-cream": "bg-foreground",
        "accent-white": "bg-accent",
        "accent-white-minimal": "bg-accent",
        "cream-proto": "bg-[color:var(--bg-main)] border border-[rgba(10,10,10,0.1)]",
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
    meta: "text-[rgba(10,10,10,0.5)]",
    rule: "bg-foreground",
    title: "text-foreground",
    tagline: "text-accent",
    foot: "text-accent",
  },
  "cream-accent": {
    mw: "text-accent",
    meta: "text-[rgba(10,10,10,0.5)]",
    rule: "bg-accent",
    title: "text-accent",
    tagline: "text-accent",
    foot: "text-accent",
  },
  "ink-cream": {
    mw: "text-[color:var(--bg-main)]",
    meta: "text-[rgba(240,232,216,0.5)]",
    rule: "bg-[color:var(--bg-main)]",
    title: "text-[color:var(--bg-main)]",
    tagline: "text-accent",
    foot: "text-[rgba(240,232,216,0.4)]",
  },
  "accent-white": {
    mw: "text-white",
    meta: "text-white/60",
    rule: "bg-white",
    title: "text-white",
    tagline: "text-white/85",
    foot: "text-white/50",
  },
  "accent-white-minimal": {
    mw: "text-white",
    meta: "text-white/60",
    rule: "bg-white",
    title: "text-white",
    tagline: "text-white/85",
    foot: "text-white/50",
  },
  "cream-proto": {
    mw: "text-foreground",
    meta: "text-[rgba(10,10,10,0.5)]",
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
  footer = "TRA INPUT E OUTPUT",
  tone = "cream-ink",
  photoSlot,
  className,
}: EditorialCoverProps) {
  const palette = palettes[tone];

  return (
    <article className={cn(coverVariants({ tone }), className)}>
      <div className="flex shrink-0 items-start justify-between">
        <span className={cn("font-display text-[11px] uppercase tracking-[-0.02em]", palette.mw)}>
          MIDDLEWARE
        </span>
        <div className={cn("text-right font-ui text-[7px] leading-normal", palette.meta)}>
          <div>{issueNumber}</div>
          <div>{season}</div>
        </div>
      </div>

      <div className={cn("my-1.75 h-0.5 shrink-0", palette.rule)} />

      <h2
        className={cn(
          "shrink-0 font-display text-[17px] uppercase leading-[0.95] tracking-[-0.03em]",
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

      <div className={cn("shrink-0 font-ui text-[6px] uppercase tracking-[0.04em]", palette.foot)}>
        {footer}
      </div>
    </article>
  );
}
