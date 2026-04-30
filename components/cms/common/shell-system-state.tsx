import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type CmsShellSystemStateProps = {
  code?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  descriptionTone?: "default" | "muted";
  actions?: ReactNode;
  size?: "sm" | "md";
  className?: string;
};

const codeSizeMap = {
  sm: "text-[clamp(48px,9vw,80px)]",
  md: "text-[clamp(70px,14vw,140px)]",
};

const titleSizeMap = {
  sm: "text-(length:--text-display-h2) leading-(--lh-xl) tracking-[-0.025em]",
  md: "text-(length:--text-display-h1) leading-(--lh-display-h1) tracking-[-0.03em]",
};

export function CmsShellSystemState({
  code,
  eyebrow,
  title,
  description,
  descriptionTone = "default",
  actions,
  size = "md",
  className,
}: CmsShellSystemStateProps) {
  const hasLeftColumn = Boolean(code || eyebrow);

  return (
    <div className={cn("flex w-full flex-col items-stretch py-2", className)}>
      <div
        className={cn(
          "grid w-full gap-y-6",
          hasLeftColumn && "md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-x-10",
        )}
      >
        {hasLeftColumn ? (
          <div className="flex min-w-0 flex-col">
            {eyebrow ? (
              <span className="font-ui text-(length:--text-meta) uppercase tracking-[0.08em] text-accent">
                {eyebrow}
              </span>
            ) : null}
            {code ? (
              <span
                aria-hidden
                className={cn(
                  "font-display leading-[0.82] tracking-tighter text-foreground",
                  codeSizeMap[size],
                  eyebrow && "mt-2",
                )}
              >
                {code}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="relative min-w-0 self-center border-l-4 border-accent pl-6">
          <h2 className={cn("font-display uppercase text-foreground", titleSizeMap[size])}>
            {title}
          </h2>
          {description ? (
            <p
              className={cn(
                "mt-3 max-w-140 font-editorial italic text-(length:--text-editorial-body) leading-(--lh-editorial)",
                descriptionTone === "muted" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {description}
            </p>
          ) : null}
          {actions ? (
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">{actions}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
