"use client";

import { ChartBar, GraduationCap, List, Map, Newspaper, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { formatArticleNumber } from "@/components/public/sections/dossier/dossier-format";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { IssueTableOfContentsItem } from "@/components/public/home/issue-table-of-contents";

const blockIcons = {
  course: GraduationCap,
  map: Map,
  questionnaireAnalysis: ChartBar,
  preview: Newspaper,
} as const;

const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getMotionDuration() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200;
}

export function MobileIssueTableOfContents({ items }: { items: IssueTableOfContentsItem[] }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const portalTarget = useSyncExternalStore(
    () => () => undefined,
    () => document.getElementById("issue-table-of-contents-action"),
    () => null,
  );
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    const previousOverflow = document.body.style.overflow;
    const inertElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-public-header], [data-public-page-content], [data-public-footer]",
      ),
    );
    document.body.style.overflow = "hidden";
    inertElements.forEach((element) => {
      element.inert = true;
    });
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        document.getElementById(menuId)?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
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
    };
  }, [menuId, visible]);

  function openMenu() {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setVisible(true);
    window.requestAnimationFrame(() => setOpen(true));
  }

  function closeMenu(onClosed?: () => void) {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      onClosed?.();
      window.requestAnimationFrame(() => buttonRef.current?.focus());
    }, getMotionDuration());
  }

  function navigateTo(itemId: string) {
    closeMenu(() => {
      window.history.pushState(null, "", `#${itemId}`);
      document.getElementById(itemId)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  }

  const trigger = (
    <button
      ref={buttonRef}
      type="button"
      aria-controls={menuId}
      aria-expanded={visible}
      aria-label={i18n.public.home.dossier.tableOfContentsOpen}
      onClick={openMenu}
      className="inline-flex min-h-11 items-center gap-2 px-2 font-ui text-[11px] font-bold tracking-[0.1em] text-foreground uppercase transition-colors duration-(--motion-fast) hover:text-accent focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      <List size={18} strokeWidth={2.5} aria-hidden="true" />
      <span>{i18n.public.home.dossier.tableOfContentsMenuTitle}</span>
    </button>
  );

  return (
    <>
      {portalTarget ? createPortal(trigger, portalTarget) : null}
      {visible
        ? createPortal(
            <div
              id={menuId}
              role="dialog"
              aria-modal="true"
              aria-label={i18n.public.home.dossier.tableOfContentsLabel}
              className={cn(
                "fixed inset-0 z-120 flex flex-col border-l border-foreground bg-background text-foreground transition-transform ease-out md:hidden",
                open ? "translate-x-0" : "translate-x-full",
              )}
              style={{ transitionDuration: `${getMotionDuration()}ms` }}
            >
              <header className="flex min-h-16 items-center justify-between gap-4 border-b-2 border-foreground px-4 sm:px-6">
                <h2 className="font-heading text-(length:--text-lg) leading-[1.2] font-bold tracking-[-0.025em]">
                  {i18n.public.home.dossier.tableOfContentsMenuTitle}
                </h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => closeMenu()}
                  aria-label={i18n.public.home.dossier.tableOfContentsClose}
                  className="flex size-11 items-center justify-center focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <X size={24} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </header>
              <nav
                className="flex-1 overflow-y-auto"
                aria-label={i18n.public.home.dossier.tableOfContentsLabel}
              >
                <ol>
                  {items.map((item) => {
                    const Icon = item.icon ? blockIcons[item.icon] : null;

                    return (
                      <li key={item.id} className="border-b border-foreground last:border-b-0">
                        <button
                          type="button"
                          onClick={() => navigateTo(item.id)}
                          className="flex min-h-18 w-full items-center gap-4 px-4 py-4 text-left transition-colors duration-(--motion-fast) hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-[-3px] sm:px-6"
                        >
                          {item.number ? (
                            <span className="shrink-0 font-heading text-[15px] leading-none font-black tracking-[-0.02em] text-accent tabular-nums">
                              {formatArticleNumber(item.number)}
                            </span>
                          ) : Icon ? (
                            <span
                              className="flex size-5 shrink-0 items-center justify-center text-accent"
                              aria-hidden="true"
                            >
                              <Icon size={18} strokeWidth={2.5} />
                            </span>
                          ) : null}
                          <span className="font-heading text-(length:--text-lg) leading-[1.2] font-bold tracking-[-0.025em]">
                            {item.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
