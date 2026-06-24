import { publicHeaderBarClassName } from "@/components/public/header/constants";
import { PublicBrand } from "@/components/public/header/public-brand";
import { PublicMenuButton } from "@/components/public/header/public-menu-button";
import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { RefObject } from "react";

type PublicFullscreenMenuProps = {
  id: string;
  onClose: () => void;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
};

export function PublicFullscreenMenu({ id, onClose, closeButtonRef }: PublicFullscreenMenuProps) {
  const text = i18n.public.menu;
  const titleId = `${id}-title`;

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-100 flex flex-col overflow-y-auto bg-foreground text-background"
    >
      <h2 id={titleId} className="sr-only">
        {text.dialogAriaLabel}
      </h2>
      <div className={`${publicHeaderBarClassName} border-b-2 border-dark-border`}>
        <PublicBrand tone="dark" onClick={onClose} />
        <PublicMenuButton
          ref={closeButtonRef}
          label={text.close}
          ariaLabel={text.closeAriaLabel}
          icon="close"
          tone="dark"
          onClick={onClose}
        />
      </div>

      <nav className={`${publicContentClassName} flex flex-1 flex-col justify-center py-7 sm:py-8`}>
        <div>
          {text.items.map((item) => (
            <Link
              key={item.number}
              href={item.href}
              onClick={onClose}
              className="flex items-baseline gap-4 border-b border-dark-line py-3 transition-colors duration-(--motion-fast) sm:gap-5.5 sm:py-3.5 md:hover:border-accent md:hover:text-accent"
            >
              <span className="font-heading text-[15px] font-bold tracking-[0.1em] text-accent">
                {item.number}
              </span>
              <span className={publicTypography.menuItem}>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="relative mt-9.5 w-full border-l-4 border-accent pl-5 md:w-1/3">
          <blockquote
            className={cn(
              "relative max-w-none text-cream-on-dark italic",
              "font-editorial text-[clamp(19px,2vw,28px)] leading-[1.22]",
            )}
          >
            {text.quote}
          </blockquote>
          <p className="mt-4 font-heading text-[11px] font-bold tracking-[0.14em] text-dark-muted uppercase">
            {text.quoteSource}
          </p>
        </div>
      </nav>
    </div>
  );
}
