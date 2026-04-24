import Link from "next/link";

import { cn } from "@/lib/utils";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

type CmsSystemScreenProps = {
  code: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function CmsSystemScreen({ code, title, description, actions }: CmsSystemScreenProps) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-275 flex-col px-(--article-padding-x) py-10">
      <div className="flex flex-1 items-center py-12">
        <div className="grid w-full gap-y-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-x-12">
          <div className="flex min-w-0 flex-col">
            <span
              aria-hidden
              className="font-display leading-[0.82] tracking-tighter text-foreground text-[clamp(100px,20vw,240px)]"
            >
              {code}
            </span>
          </div>

          <div className="relative min-w-0 self-center border-l-4 border-accent pl-6">
            <h1 className="font-display uppercase text-(length:--text-display-h1) leading-(--lh-display-h1) tracking-[-0.03em] text-foreground">
              {title}
            </h1>
            <p className="mt-4 max-w-140 font-editorial italic text-[19px] leading-(--lh-editorial) text-foreground">
              {description}
            </p>
            {actions ? (
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">{actions}</div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

type CmsSystemActionLinkProps = {
  href: string;
  children: ReactNode;
  tone?: "accent" | "foreground";
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className" | "children">;

export function CmsSystemActionLink({
  href,
  children,
  tone = "accent",
  ...rest
}: CmsSystemActionLinkProps) {
  return (
    <Link href={href} {...rest} className={systemActionClass(tone)}>
      <span aria-hidden>→</span>
      <span className="border-b border-dashed border-current hover:border-solid">{children}</span>
    </Link>
  );
}

type CmsSystemActionButtonProps = {
  onClick: () => void;
  children: ReactNode;
  tone?: "accent" | "foreground";
  type?: "button" | "submit";
};

export function CmsSystemActionButton({
  onClick,
  children,
  tone = "accent",
  type = "button",
}: CmsSystemActionButtonProps) {
  return (
    <button type={type} onClick={onClick} className={systemActionClass(tone)}>
      <span aria-hidden>→</span>
      <span className="border-b border-dashed border-current hover:border-solid">{children}</span>
    </button>
  );
}

function systemActionClass(tone: "accent" | "foreground") {
  return cn(
    "inline-flex items-center gap-2 font-ui text-[11px] uppercase tracking-[0.08em] transition-colors",
    tone === "accent" ? "text-accent hover:text-foreground" : "text-foreground hover:text-accent",
  );
}
