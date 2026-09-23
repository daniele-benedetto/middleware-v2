"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

import { PublicFullscreenMenu } from "@/components/public/header/public-fullscreen-menu";
import { PublicMenuButton } from "@/components/public/header/public-menu-button";
import { i18n } from "@/lib/i18n";
import { publicAnalyticsEvents, trackPublicAnalyticsEvent } from "@/lib/public/analytics";

import type { PublicMenuItem } from "@/components/public/header/public-fullscreen-menu";
import type { MouseEvent } from "react";

type PublicMenuControllerProps = {
  menuItems: PublicMenuItem[];
};

type MenuPhase = "closed" | "opening" | "open" | "closing";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isElementVisible(element: HTMLElement) {
  return element.getClientRects().length > 0;
}

export function PublicMenuController({ menuItems }: PublicMenuControllerProps) {
  const router = useRouter();
  const [menuPhase, setMenuPhase] = useState<MenuPhase>("closed");
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);
  const menuTimerRef = useRef<number | null>(null);
  const menuFrameRef = useRef<number | null>(null);
  const menuCallbackRef = useRef<(() => void) | undefined>(undefined);
  const text = i18n.public.header;
  const menuVisible = menuPhase !== "closed";

  const clearMenuTimers = () => {
    if (menuTimerRef.current !== null) {
      window.clearTimeout(menuTimerRef.current);
      menuTimerRef.current = null;
    }
    if (menuFrameRef.current !== null) {
      window.cancelAnimationFrame(menuFrameRef.current);
      menuFrameRef.current = null;
    }
  };

  const openMenu = (restoreFocus: boolean) => {
    clearMenuTimers();
    restoreFocusRef.current = restoreFocus;
    setMenuPhase("opening");
    menuFrameRef.current = window.requestAnimationFrame(() => {
      menuFrameRef.current = null;
      setMenuPhase("open");
    });
  };

  const closeMenu = (restoreFocus = true, onClosed?: () => void) => {
    if (!menuVisible || menuPhase === "closing") {
      return;
    }

    clearMenuTimers();
    restoreFocusRef.current = restoreFocus;
    menuCallbackRef.current = onClosed;
    setMenuPhase("closing");
    menuTimerRef.current = window.setTimeout(() => {
      menuTimerRef.current = null;
      setMenuPhase("closed");
      const callback = menuCallbackRef.current;
      menuCallbackRef.current = undefined;
      callback?.();
    }, 180);
  };

  const navigateAfterMenuClose = (href: string) => {
    trackPublicAnalyticsEvent(publicAnalyticsEvents.menuNavigate, {
      target_path: href,
      target_type: href.startsWith("http") ? "external" : "internal",
      external: href.startsWith("http"),
    });
    restoreFocusRef.current = false;
    closeMenu(false, () => router.push(href));
  };

  const toggleMenu = (event: MouseEvent<HTMLButtonElement>) => {
    if (menuPhase === "open") {
      const restoreFocus = event.detail === 0;
      if (!restoreFocus) event.currentTarget.blur();
      closeMenu(restoreFocus);
      return;
    }
    trackPublicAnalyticsEvent(publicAnalyticsEvents.menuOpen, { item_count: menuItems.length });
    const restoreFocus = event.detail === 0;
    if (!restoreFocus) event.currentTarget.blur();
    openMenu(restoreFocus);
  };

  const closeMenuFromEffect = useEffectEvent(() => closeMenu(true));

  useEffect(() => {
    return () => clearMenuTimers();
  }, []);

  useEffect(() => {
    if (!menuVisible) return;

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    const inertElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-public-page-content], [data-public-footer]"),
    );
    document.body.style.overflow = "hidden";
    inertElements.forEach((element) => {
      element.inert = true;
    });
    if (restoreFocusRef.current) {
      menuCloseButtonRef.current?.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenuFromEffect();
        return;
      }

      if (event.key !== "Tab") return;

      const menu = document.getElementById(menuId);
      const focusableElements = Array.from(
        menu?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter(isElementVisible);

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!menu?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement)?.focus();
        return;
      }

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
      inertElements.forEach((element) => {
        element.inert = false;
      });
      window.removeEventListener("keydown", handleKeyDown);
      if (restoreFocusRef.current) {
        menuButton?.focus({ preventScroll: true });
      }
    };
  }, [menuId, menuVisible]);

  return (
    <>
      <PublicMenuButton
        ref={menuButtonRef}
        label={text.openMenu}
        ariaLabel={text.openMenuAriaLabel}
        icon="menu"
        expanded={menuVisible}
        controls={menuId}
        disabled={menuVisible}
        onClick={toggleMenu}
      />

      {menuVisible ? (
        <PublicFullscreenMenu
          id={menuId}
          state={menuPhase === "opening" || menuPhase === "open" ? "open" : "closing"}
          items={menuItems}
          closeButtonRef={menuCloseButtonRef}
          onClose={(event) => {
            const restoreFocus = event.detail === 0;
            if (!restoreFocus) event.currentTarget.blur();
            closeMenu(restoreFocus);
          }}
          onNavigate={navigateAfterMenuClose}
        />
      ) : null}
    </>
  );
}
