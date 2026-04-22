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
        isAccent ? "bg-accent text-white" : "bg-card-hover text-foreground",
        "transition-[filter] duration-[var(--motion-base)] ease-[cubic-bezier(0.2,0,0,1)] hover:brightness-[0.93]",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span
          className={cn(
            "font-ui text-[11px] uppercase tracking-[0.06em]",
            isAccent ? "text-white" : "text-foreground",
          )}
        >
          {eyebrow}
        </span>
        {meta ? (
          <span
            className={cn(
              "font-ui text-[11px]",
              isAccent ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {meta}
          </span>
        ) : null}
      </div>

      <h2
        className={cn(
          "flex-1 font-display uppercase",
          "text-[length:clamp(15px,2vw,22px)] leading-[var(--lh-xl)] tracking-[-0.025em]",
          isAccent ? "text-white" : "text-foreground",
        )}
      >
        {title}
      </h2>

      {children}

      <Link
        href={href}
        className={cn(
          "self-start border px-3 py-1.75 font-ui text-[11px] uppercase tracking-[0.04em]",
          isAccent
            ? "border-white text-white hover:bg-white hover:text-accent"
            : "border-foreground text-foreground hover:bg-foreground hover:text-[color:var(--bg-main)]",
        )}
      >
        → {ctaLabel}
      </Link>
    </Tag>
  );
}
