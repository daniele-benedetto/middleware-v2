import { publicHeaderBarClassName } from "@/components/public/header/constants";
import { PublicBrand } from "@/components/public/header/public-brand";
import { PublicMenuButton } from "@/components/public/header/public-menu-button";
import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { CSSProperties, MouseEvent, RefObject } from "react";

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
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onNavigate: (href: string) => void;
};

function shouldUseNativeNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function getQuoteDelay(itemCount: number) {
  const lastItemIndex = Math.max(0, itemCount - 1);
  return 110 + lastItemIndex * 165 + 260;
}

export function PublicFullscreenMenu({
  id,
  state,
  items,
  closeButtonRef,
  onClose,
  onNavigate,
}: PublicFullscreenMenuProps) {
  const text = i18n.public.menu;
  const titleId = `${id}-title`;
  const menuClosing = state === "closing-content" || state === "closing-shell";

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-lenis-prevent
      data-menu-state={state}
      style={{ "--menu-quote-delay": `${getQuoteDelay(items.length)}ms` } as CSSProperties}
      className="public-menu-overlay fixed inset-0 z-100 flex flex-col overflow-y-auto bg-foreground text-background"
    >
      <h2 id={titleId} className="sr-only">
        {text.dialogAriaLabel}
      </h2>

      <div className="public-menu-header relative z-20 border-b-2 border-dark-border text-background">
        <div className={publicHeaderBarClassName}>
          <PublicBrand
            tone="dark"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/");
            }}
          />
          <PublicMenuButton
            ref={closeButtonRef}
            label={text.close}
            ariaLabel={text.closeAriaLabel}
            icon="close"
            tone="dark"
            expanded
            controls={id}
            disabled={menuClosing}
            onClick={onClose}
          />
        </div>
      </div>

      <nav
        className={`${publicContentClassName} relative z-10 flex flex-1 flex-col justify-center py-18 sm:py-22`}
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
        </div>
      </nav>
    </div>
  );
}
