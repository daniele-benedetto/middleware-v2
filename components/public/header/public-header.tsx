"use client";

import { useEffect, useId, useRef, useState } from "react";

import { publicHeaderBarClassName } from "@/components/public/header/constants";
import { PublicBrand } from "@/components/public/header/public-brand";
import { PublicFullscreenMenu } from "@/components/public/header/public-fullscreen-menu";
import { PublicMenuButton } from "@/components/public/header/public-menu-button";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PublicHeaderProps = {
  className?: string;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function PublicHeader({ className }: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const text = i18n.public.header;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const menu = document.getElementById(menuId);
      const focusableElements = Array.from(
        menu?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((element) => element.offsetParent !== null || element === closeButtonRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      menuButton?.focus();
    };
  }, [menuId, menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header
        className={cn("sticky top-0 z-50 border-b-2 border-foreground bg-background", className)}
        style={{ viewTransitionName: "public-header" }}
      >
        <div className={publicHeaderBarClassName}>
          <PublicBrand priority />
          <PublicMenuButton
            ref={menuButtonRef}
            label={text.openMenu}
            ariaLabel={text.openMenuAriaLabel}
            icon="menu"
            expanded={menuOpen}
            controls={menuId}
            onClick={() => setMenuOpen(true)}
          />
        </div>
      </header>

      {menuOpen ? (
        <PublicFullscreenMenu id={menuId} onClose={closeMenu} closeButtonRef={closeButtonRef} />
      ) : null}
    </>
  );
}
