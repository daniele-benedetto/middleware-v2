import Link from "next/link";

import { publicHeaderBarClassName } from "@/components/public/header/constants";
import { PublicBrand } from "@/components/public/header/public-brand";
import { PublicMenuButton } from "@/components/public/header/public-menu-button";
import { publicTypography } from "@/components/public/primitives";
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

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={text.dialogAriaLabel}
      className="fixed inset-0 z-100 flex flex-col overflow-y-auto bg-foreground text-background"
    >
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

      <nav className="flex w-full flex-1 flex-col justify-center px-4 py-7 sm:px-6 sm:py-8 lg:px-12">
        {text.items.map((item) => (
          <Link
            key={item.number}
            href={item.href}
            onClick={onClose}
            className="flex items-baseline gap-4 border-b border-dark-line py-3 transition-colors duration-(--motion-fast) hover:border-accent hover:text-accent sm:gap-5.5 sm:py-3.5"
          >
            <span className="font-heading text-[15px] font-bold tracking-[0.1em] text-accent">
              {item.number}
            </span>
            <span className={publicTypography.menuItem}>{item.label}</span>
          </Link>
        ))}
        <figure className="mt-9.5 max-w-[46ch]">
          <blockquote className={cn("text-dark-muted italic", publicTypography.editorialSmall)}>
            “{text.quote}”
          </blockquote>
          <figcaption
            className={cn("mt-3 text-dark-muted italic", publicTypography.editorialSmall)}
          >
            {text.quoteSource}
          </figcaption>
        </figure>
      </nav>
    </div>
  );
}
