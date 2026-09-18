"use client";

import { ChartBar, GraduationCap, List, Map, Newspaper, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { publicContentClassName } from "@/components/public/primitives";
import { formatArticleNumber } from "@/components/public/sections/dossier/dossier-format";
import { i18n } from "@/lib/i18n";
import { publicAnalyticsEvents, trackPublicAnalyticsEvent } from "@/lib/public/analytics";
import { cn } from "@/lib/utils";

import type {
  IssueTableOfContentsIssue,
  IssueTableOfContentsItem,
} from "@/components/public/home/issue-table-of-contents";
import type { MouseEvent as ReactMouseEvent } from "react";

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

export function IssueTableOfContentsMenu({
  items,
  issueNumber,
  issueTitle,
  issues,
}: {
  items: IssueTableOfContentsItem[];
  issueNumber: string;
  issueTitle: string;
  issues: IssueTableOfContentsIssue[];
}) {
  const [activeMenu, setActiveMenu] = useState<"issues" | "tableOfContents" | null>(null);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [desktopTabMounted, setDesktopTabMounted] = useState(false);
  const [desktopTabVisible, setDesktopTabVisible] = useState(false);
  const [mobileTabDocked, setMobileTabDocked] = useState(false);
  const issuesMenuId = useId();
  const tableOfContentsMenuId = useId();
  const menuId = activeMenu === "issues" ? issuesMenuId : tableOfContentsMenuId;
  const mobileTabSentinelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const desktopTabFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (desktopTabFrameRef.current) window.cancelAnimationFrame(desktopTabFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const desktopIndex = document.getElementById("indice");
    const mobileTabSentinel = mobileTabSentinelRef.current;
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const desktopObserver = desktopIndex
      ? new IntersectionObserver(
          ([entry]) => {
            setDesktopTabVisibility(
              mediaQuery.matches && !entry.isIntersecting && entry.boundingClientRect.bottom <= 72,
            );
          },
          { rootMargin: "-72px 0px 0px 0px" },
        )
      : null;
    const mobileObserver = mobileTabSentinel
      ? new IntersectionObserver(
          ([entry]) => {
            setMobileTabDocked(
              !mediaQuery.matches && !entry.isIntersecting && entry.boundingClientRect.top <= 72,
            );
          },
          { rootMargin: "-72px 0px 0px 0px" },
        )
      : null;

    const resetInactiveBreakpoint = () => {
      if (mediaQuery.matches) {
        setMobileTabDocked(false);
      } else {
        setDesktopTabVisibility(false);
      }
    };

    if (desktopObserver && desktopIndex) {
      desktopObserver.observe(desktopIndex);
    }
    if (mobileObserver && mobileTabSentinel) {
      mobileObserver.observe(mobileTabSentinel);
    }
    mediaQuery.addEventListener("change", resetInactiveBreakpoint);
    resetInactiveBreakpoint();

    return () => {
      desktopObserver?.disconnect();
      mobileObserver?.disconnect();
      mediaQuery.removeEventListener("change", resetInactiveBreakpoint);
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

  function setDesktopTabVisibility(nextVisible: boolean) {
    if (desktopTabFrameRef.current) {
      window.cancelAnimationFrame(desktopTabFrameRef.current);
      desktopTabFrameRef.current = null;
    }

    if (nextVisible) {
      setDesktopTabMounted(true);
      desktopTabFrameRef.current = window.requestAnimationFrame(() => {
        desktopTabFrameRef.current = null;
        setDesktopTabVisible(true);
      });
      return;
    }

    setDesktopTabVisible(false);
  }

  function openMenu(event: ReactMouseEvent<HTMLButtonElement>, menu: "issues" | "tableOfContents") {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    triggerRef.current = event.currentTarget;
    const source = window.matchMedia("(min-width: 768px)").matches
      ? "desktop_sticky"
      : "mobile_sticky";
    trackPublicAnalyticsEvent(
      menu === "issues"
        ? publicAnalyticsEvents.issueSwitcherOpen
        : publicAnalyticsEvents.issueTableOfContentsOpen,
      { item_count: menu === "issues" ? issues.length : items.length, source },
    );
    setActiveMenu(menu);
    setVisible(true);
    window.requestAnimationFrame(() => setOpen(true));
  }

  function closeMenu(onClosed?: () => void) {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    setOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setActiveMenu(null);
      onClosed?.();
      window.requestAnimationFrame(() => triggerRef.current?.focus());
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

  function renderTableOfContentsTrigger(tabIndex?: number) {
    return (
      <button
        type="button"
        aria-controls={menuId}
        aria-expanded={visible}
        aria-label={i18n.public.home.dossier.tableOfContentsOpen}
        onClick={(event) => openMenu(event, "tableOfContents")}
        tabIndex={tabIndex}
        className="inline-flex min-h-10 cursor-pointer items-center gap-2 px-2 font-ui text-[11px] font-bold tracking-[0.1em] text-foreground uppercase decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) hover:text-accent hover:underline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        <List size={18} strokeWidth={2.5} aria-hidden="true" />
        <span>{i18n.public.home.dossier.tableOfContentsMenuTitle}</span>
      </button>
    );
  }

  function renderIssuesTrigger(tabIndex?: number) {
    return (
      <button
        type="button"
        aria-controls={issuesMenuId}
        aria-expanded={visible && activeMenu === "issues"}
        aria-label={i18n.public.home.dossier.issueSwitcherOpen}
        onClick={(event) => openMenu(event, "issues")}
        tabIndex={tabIndex}
        className="inline-flex min-h-10 min-w-0 max-w-[calc(100%-5.5rem)] cursor-pointer items-center gap-1 px-2 font-ui text-[11px] font-bold tracking-[0.1em] text-foreground uppercase decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) hover:text-accent hover:underline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        <span className="shrink-0 tabular-nums">{issueNumber}</span>
        <span aria-hidden="true">-</span>
        <span className="truncate">{issueTitle}</span>
      </button>
    );
  }

  const isIssuesMenu = activeMenu === "issues";

  return (
    <>
      <div ref={mobileTabSentinelRef} className="md:hidden" aria-hidden="true" />
      <div
        className={cn(
          "sticky top-18 z-40 border-y border-foreground bg-background text-foreground md:hidden",
          mobileTabDocked && "border-t-transparent",
        )}
      >
        <div className={`${publicContentClassName} flex h-10 items-center justify-between`}>
          {renderIssuesTrigger()}
          {renderTableOfContentsTrigger()}
        </div>
      </div>
      {desktopTabMounted ? (
        <div
          aria-hidden={!desktopTabVisible}
          data-visible={desktopTabVisible}
          className={cn(
            "issue-table-of-contents-desktop-tab fixed top-18 right-0 left-0 z-40 hidden h-10 border-y border-t-transparent border-foreground bg-background text-foreground md:block",
            !desktopTabVisible && "pointer-events-none",
          )}
          onAnimationEnd={(event) => {
            if (event.animationName === "issue-table-of-contents-tab-out" && !desktopTabVisible) {
              setDesktopTabMounted(false);
            }
          }}
        >
          <div className={`${publicContentClassName} flex h-full items-center justify-between`}>
            {renderIssuesTrigger(desktopTabVisible ? undefined : -1)}
            {renderTableOfContentsTrigger(desktopTabVisible ? undefined : -1)}
          </div>
        </div>
      ) : null}
      {visible
        ? createPortal(
            <div
              className={cn(
                "fixed inset-0 z-120 bg-foreground/80 transition-colors duration-(--motion-fast)",
                open ? "bg-foreground/80" : "bg-foreground/0",
              )}
              onClick={() => closeMenu()}
            >
              <div
                id={menuId}
                role="dialog"
                aria-modal="true"
                aria-label={
                  isIssuesMenu
                    ? i18n.public.home.dossier.issueSwitcherTitle
                    : i18n.public.home.dossier.tableOfContentsLabel
                }
                className={cn(
                  "absolute inset-y-0 flex w-full flex-col bg-background text-foreground transition-transform ease-out md:w-[min(32rem,42vw)]",
                  isIssuesMenu
                    ? "left-0 border-r border-foreground"
                    : "right-0 border-l border-foreground",
                  open ? "translate-x-0" : isIssuesMenu ? "-translate-x-full" : "translate-x-full",
                )}
                style={{ transitionDuration: `${getMotionDuration()}ms` }}
                onClick={(event) => event.stopPropagation()}
              >
                <header className="flex min-h-16 items-center justify-between gap-4 border-b-2 border-foreground px-4 sm:px-6 md:px-8">
                  <h2 className="font-heading text-(length:--text-lg) leading-[1.2] font-bold tracking-[-0.025em]">
                    {isIssuesMenu
                      ? i18n.public.home.dossier.issueSwitcherTitle
                      : i18n.public.home.dossier.tableOfContentsMenuTitle}
                  </h2>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => closeMenu()}
                    aria-label={
                      isIssuesMenu
                        ? i18n.public.home.dossier.issueSwitcherClose
                        : i18n.public.home.dossier.tableOfContentsClose
                    }
                    className="flex size-11 cursor-pointer items-center justify-center focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <X size={24} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </header>
                <nav
                  className="flex-1 overflow-y-auto"
                  aria-label={
                    isIssuesMenu
                      ? i18n.public.home.dossier.issueSwitcherTitle
                      : i18n.public.home.dossier.tableOfContentsLabel
                  }
                >
                  <ol>
                    {isIssuesMenu
                      ? issues.map((issue) => {
                          const current = issue.issueNumber === issueNumber;

                          return (
                            <li
                              key={issue.id}
                              className="border-b border-foreground last:border-b-0"
                            >
                              <a
                                href={`/uscite/${issue.slug}`}
                                aria-current={current ? "page" : undefined}
                                className={cn(
                                  "flex min-h-18 w-full cursor-pointer items-center gap-4 px-4 py-4 text-left transition-colors duration-(--motion-fast) hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-[-3px] sm:px-6 md:px-8",
                                  current && "bg-surface-hover",
                                )}
                              >
                                <span className="shrink-0 font-heading text-[15px] leading-none font-black tracking-[-0.02em] text-accent tabular-nums">
                                  {issue.issueNumber}
                                </span>
                                <span className="font-heading text-(length:--text-lg) leading-[1.2] font-bold tracking-[-0.025em]">
                                  {issue.title}
                                </span>
                              </a>
                            </li>
                          );
                        })
                      : items.map((item) => {
                          const Icon = item.icon ? blockIcons[item.icon] : null;

                          return (
                            <li
                              key={item.id}
                              className="border-b border-foreground last:border-b-0"
                            >
                              <button
                                type="button"
                                onClick={() => navigateTo(item.id)}
                                className="flex min-h-18 w-full cursor-pointer items-center gap-4 px-4 py-4 text-left transition-colors duration-(--motion-fast) hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-[-3px] sm:px-6 md:px-8"
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
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
