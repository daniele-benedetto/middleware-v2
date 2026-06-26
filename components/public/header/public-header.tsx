"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

import { publicHeaderBarClassName } from "@/components/public/header/constants";
import { PublicBrand } from "@/components/public/header/public-brand";
import { PublicFullscreenMenu } from "@/components/public/header/public-fullscreen-menu";
import { PublicMenuButton } from "@/components/public/header/public-menu-button";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PublicHeaderProps = {
  className?: string;
};

type MenuState = "closed" | "opening" | "open" | "closing-content" | "closing-shell";

const menuOpenAnimationDuration = 1080;
const menuContentCloseDuration = 420;
const menuShellCloseDuration = 360;

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

export function PublicHeader({ className }: PublicHeaderProps) {
  const router = useRouter();
  const [menuState, setMenuState] = useState<MenuState>("closed");
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const animationTimerRefs = useRef<number[]>([]);
  const text = i18n.public.header;
  const menuText = i18n.public.menu;
  const menuVisible = menuState !== "closed";
  const headerMenuActive = menuVisible;
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
    setAnimationTimer(() => {
      setMenuState("open");
    }, menuOpenAnimationDuration);
  };

  const closeMenu = (onClosed?: () => void) => {
    if (!menuVisible) {
      onClosed?.();
      return;
    }

    clearAnimationTimer();
    setMenuState("closing-content");
    setAnimationTimer(() => {
      setMenuState("closing-shell");
    }, menuContentCloseDuration);
    setAnimationTimer(() => {
      setMenuState("closed");
      if (onClosed) {
        window.requestAnimationFrame(onClosed);
      }
    }, menuContentCloseDuration + menuShellCloseDuration);
  };

  const navigateAfterMenuClose = (href: string) => {
    if (menuClosing) {
      return;
    }

    closeMenu(() => {
      router.push(href);
    });
  };

  const toggleMenu = () => {
    if (menuClosing) {
      return;
    }

    if (headerMenuActive) {
      closeMenu();
      return;
    }

    openMenu();
  };

  const closeMenuFromEffect = useEffectEvent(() => {
    closeMenu();
  });

  useEffect(() => {
    if (!menuVisible) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    const inertElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-public-page-content], [data-public-footer]"),
    );
    document.body.style.overflow = "hidden";
    inertElements.forEach((element) => {
      element.inert = true;
    });
    menuButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenuFromEffect();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const menu = document.getElementById(menuId);
      const menuFocusableElements = Array.from(
        menu?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      );
      const focusableElements = [menuButtonRef.current, ...menuFocusableElements].filter(
        (element): element is HTMLElement => Boolean(element && isElementVisible(element)),
      );

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
      <header
        data-public-header
        data-menu-state={menuState}
        className={cn(
          "sticky top-0 z-50 border-b-2 border-foreground bg-background text-foreground",
          "transition-[background-color,border-color,color] duration-(--motion-slow) ease-(--easing-standard)",
          menuVisible && "z-120",
          headerMenuActive && "border-dark-border bg-transparent text-background",
          className,
        )}
      >
        <div className={cn(publicHeaderBarClassName, "relative z-130")}>
          <PublicBrand
            priority
            tone={headerMenuActive ? "dark" : "light"}
            onClick={menuVisible ? closeMenu : undefined}
          />
          <PublicMenuButton
            ref={menuButtonRef}
            label={headerMenuActive ? menuText.close : text.openMenu}
            ariaLabel={headerMenuActive ? menuText.closeAriaLabel : text.openMenuAriaLabel}
            icon={headerMenuActive ? "close" : "menu"}
            tone={headerMenuActive ? "dark" : "light"}
            expanded={headerMenuActive}
            controls={menuId}
            disabled={menuClosing}
            onClick={toggleMenu}
          />
        </div>
      </header>

      {menuVisible ? (
        <PublicFullscreenMenu id={menuId} state={menuState} onNavigate={navigateAfterMenuClose} />
      ) : null}
    </>
  );
}
