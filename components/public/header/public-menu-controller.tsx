"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

import { PublicFullscreenMenu } from "@/components/public/header/public-fullscreen-menu";
import { PublicMenuButton } from "@/components/public/header/public-menu-button";
import { i18n } from "@/lib/i18n";
import { publicAnalyticsEvents, trackPublicAnalyticsEvent } from "@/lib/public/analytics";

import type { PublicMenuItem } from "@/components/public/header/public-fullscreen-menu";

type PublicMenuControllerProps = {
  menuItems: PublicMenuItem[];
};

type MenuState = "closed" | "opening" | "open" | "closing-content" | "closing-shell";

const menuShellCloseDuration = 360;
const menuItemOpenStagger = 165;
const menuItemCloseStagger = 64;
const menuLinkOpenDelay = 110;
const menuLinkOpenDuration = 380;
const menuQuoteOpenDuration = 420;
const menuLinkCloseDuration = 220;
const menuQuoteOpenGap = 80;

function getMenuOpenAnimationDuration(itemCount: number) {
  return (
    menuLinkOpenDelay +
    Math.max(0, itemCount - 1) * menuItemOpenStagger +
    menuLinkOpenDuration +
    menuQuoteOpenGap +
    menuQuoteOpenDuration +
    60
  );
}

function getMenuContentCloseDuration(itemCount: number) {
  return 140 + Math.max(0, itemCount - 1) * menuItemCloseStagger + menuLinkCloseDuration + 40;
}

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
  const [menuState, setMenuState] = useState<MenuState>("closed");
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null);
  const animationTimerRefs = useRef<number[]>([]);
  const text = i18n.public.header;
  const menuOpenAnimationDuration = getMenuOpenAnimationDuration(menuItems.length);
  const menuContentCloseDuration = getMenuContentCloseDuration(menuItems.length);
  const menuVisible = menuState !== "closed";
  const menuClosing = menuState === "closing-content" || menuState === "closing-shell";

  useEffect(() => {
    return () => {
      animationTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
      animationTimerRefs.current = [];
    };
  }, []);

  const clearAnimationTimer = () => {
    animationTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
    animationTimerRefs.current = [];
  };

  const setAnimationTimer = (callback: () => void, delay: number) => {
    const timerId = window.setTimeout(() => {
      animationTimerRefs.current = animationTimerRefs.current.filter((id) => id !== timerId);
      callback();
    }, delay);
    animationTimerRefs.current.push(timerId);
  };

  const openMenu = () => {
    clearAnimationTimer();
    setMenuState("opening");
    setAnimationTimer(() => setMenuState("open"), menuOpenAnimationDuration);
  };

  const closeMenu = (onClosed?: () => void) => {
    if (!menuVisible) {
      onClosed?.();
      return;
    }

    clearAnimationTimer();
    setMenuState("closing-content");
    setAnimationTimer(() => setMenuState("closing-shell"), menuContentCloseDuration);
    setAnimationTimer(() => {
      setMenuState("closed");
      if (onClosed) window.requestAnimationFrame(onClosed);
    }, menuContentCloseDuration + menuShellCloseDuration);
  };

  const navigateAfterMenuClose = (href: string) => {
    if (menuClosing) return;
    trackPublicAnalyticsEvent(publicAnalyticsEvents.menuNavigate, {
      target_path: href,
      target_type: href.startsWith("http") ? "external" : "internal",
      external: href.startsWith("http"),
    });
    closeMenu(() => router.push(href));
  };

  const toggleMenu = () => {
    if (menuClosing) return;
    if (menuVisible) {
      closeMenu();
      return;
    }
    trackPublicAnalyticsEvent(publicAnalyticsEvents.menuOpen, { item_count: menuItems.length });
    openMenu();
  };

  const closeMenuFromEffect = useEffectEvent(() => closeMenu());

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
    menuCloseButtonRef.current?.focus();

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
      menuButton?.focus();
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
          state={menuState}
          items={menuItems}
          closeButtonRef={menuCloseButtonRef}
          onClose={() => closeMenu()}
          onNavigate={navigateAfterMenuClose}
        />
      ) : null}
    </>
  );
}
