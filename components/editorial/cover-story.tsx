import Link from "next/link";

import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type EditorialCoverStoryProps = {
  eyebrow: string;
  meta?: string;
  title: string;
  ctaLabel: string;
  href: string;
  tone?: "accent" | "neutral";
  as?: "article" | "section" | "div";
  className?: string;
  children?: ReactNode;
};

export function EditorialCoverStory({
  eyebrow,
  meta,
  title,
  ctaLabel,
  href,
  tone = "accent",
  as: Tag = "article",
  className,
  children,
}: EditorialCoverStoryProps) {
  const isAccent = tone === "accent";

  return (
    <Tag
      className={cn(
        "flex min-h-55 flex-col gap-3 px-5.5 py-5",
        isAccent ? "bg-accent text-background" : "bg-card-hover text-foreground",
        "transition-[filter] duration-(--motion-base) ease-[cubic-bezier(0.2,0,0,1)] hover:brightness-[0.93]",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span
          className={cn(
            "font-ui text-[11px] font-extrabold uppercase tracking-[0.1em]",
            isAccent ? "text-background" : "text-foreground",
          )}
        >
          {eyebrow}
        </span>
        {meta ? (
          <span
            className={cn(
              "font-ui text-[11px]",
              isAccent ? "text-background/70" : "text-muted-foreground",
            )}
          >
            {meta}
          </span>
        ) : null}
      </div>

      <h2
        className={cn(
          "flex-1 font-display font-bold",
          "text-[clamp(15px,2vw,22px)] leading-[1.08] tracking-[-0.02em]",
          isAccent ? "text-background" : "text-foreground",
        )}
      >
        {title}
      </h2>

      {children}

      <Link
        href={href}
        className={cn(
          "self-start rounded-[6px] border px-3 py-1.75 font-ui text-[12px] font-bold",
          isAccent
            ? "border-background text-background hover:bg-background hover:text-accent"
            : "border-foreground text-foreground hover:bg-foreground hover:text-(--bg-main)",
        )}
      >
        → {ctaLabel}
      </Link>
    </Tag>
  );
}
