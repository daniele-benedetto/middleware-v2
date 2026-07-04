import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { CSSProperties, MouseEvent } from "react";

export type PublicMenuItem = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
};

type PublicFullscreenMenuProps = {
  id: string;
  state: "opening" | "open" | "closing-content" | "closing-shell";
  items: PublicMenuItem[];
  onNavigate: (href: string) => void;
};

function shouldUseNativeNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function getQuoteDelay(itemCount: number) {
  const lastItemIndex = Math.max(0, itemCount - 1);
  return 110 + lastItemIndex * 165 + 260;
}

export function PublicFullscreenMenu({ id, state, items, onNavigate }: PublicFullscreenMenuProps) {
  const text = i18n.public.menu;
  const titleId = `${id}-title`;

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-menu-state={state}
      style={{ "--menu-quote-delay": `${getQuoteDelay(items.length)}ms` } as CSSProperties}
      className="public-menu-overlay fixed inset-0 z-100 flex flex-col overflow-y-auto bg-foreground text-background"
    >
      <h2 id={titleId} className="sr-only">
        {text.dialogAriaLabel}
      </h2>

      <nav
        className={`${publicContentClassName} relative z-10 flex flex-1 flex-col justify-center py-24 sm:py-28`}
      >
        <div className="public-menu-link-list">
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={(event) => {
                if (item.external || shouldUseNativeNavigation(event)) {
                  return;
                }

                event.preventDefault();
                onNavigate(item.href);
              }}
              className="public-menu-link relative flex items-baseline gap-4 py-3 transition-colors duration-(--motion-fast) sm:gap-5.5 sm:py-3.5 md:hover:text-accent"
              style={
                {
                  "--menu-item-index": index,
                  "--menu-item-reverse-index": items.length - index - 1,
                } as CSSProperties
              }
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
            >
              <span className="public-menu-link-part font-heading text-[15px] font-bold tracking-widest text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={cn("public-menu-link-part", publicTypography.menuItem)}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="public-menu-quote relative mt-9.5 w-full border-l-4 border-accent pl-5 md:w-1/2">
          <blockquote
            className={cn(
              "relative max-w-none text-cream-on-dark italic",
              "font-editorial text-[clamp(19px,2vw,28px)] leading-[1.22]",
            )}
          >
            {text.quote_1}
            <br />
            {text.quote_2}
          </blockquote>
          <p className="mt-4 font-heading text-[11px] font-bold tracking-[0.14em] text-dark-muted uppercase">
            {text.quoteSource}
          </p>
        </div>
      </nav>
    </div>
  );
}
