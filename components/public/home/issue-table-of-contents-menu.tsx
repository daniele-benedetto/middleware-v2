"use client";

import { ChartBar, GraduationCap, List, Map, Newspaper, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PublicSearchMenuResults } from "@/components/public/home/public-search-menu-results";
import { publicContentClassName } from "@/components/public/primitives";
import { formatArticleNumber } from "@/components/public/sections/dossier/dossier-format";
import { i18n } from "@/lib/i18n";
import { publicAnalyticsEvents, trackPublicAnalyticsEvent } from "@/lib/public/analytics";
import { cn } from "@/lib/utils";

import type {
  IssueTableOfContentsIssue,
  IssueTableOfContentsItem,
} from "@/components/public/home/issue-table-of-contents";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";

const blockIcons = {
  course: GraduationCap,
  map: Map,
  questionnaireAnalysis: ChartBar,
  preview: Newspaper,
} as const;

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

type MenuPhase = "closed" | "opening" | "open" | "closing";

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
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<"issues" | "search" | "tableOfContents" | null>(
    null,
  );
  const [phase, setPhase] = useState<MenuPhase>("closed");
  const [searchValue, setSearchValue] = useState("");
  const issuesMenuId = useId();
  const searchMenuId = useId();
  const tableOfContentsMenuId = useId();
  const menuId =
    activeMenu === "issues"
      ? issuesMenuId
      : activeMenu === "search"
        ? searchMenuId
        : tableOfContentsMenuId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const searchFocusTimerRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<MenuPhase>("closed");
  const closeCallbackRef = useRef<(() => void) | undefined>(undefined);

  const visible = phase !== "closed";
  const open = phase === "open";

  function setMenuPhase(nextPhase: MenuPhase) {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }

  function clearOpenFrame() {
    if (openFrameRef.current) {
      window.cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }
  }

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function clearSearchFocusTimer() {
    if (searchFocusTimerRef.current) {
      window.clearTimeout(searchFocusTimerRef.current);
      searchFocusTimerRef.current = null;
    }
  }

  const closeMenuFromEffect = useEffectEvent(() => closeMenu());

  useEffect(() => {
    return () => {
      clearOpenFrame();
      clearCloseTimer();
      clearSearchFocusTimer();
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
    if (activeMenu !== "search") {
      closeButtonRef.current?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenuFromEffect();
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
  }, [activeMenu, menuId, visible]);

  useEffect(() => {
    if (phase !== "closed") return;

    const onClosed = closeCallbackRef.current;
    if (!onClosed) return;

    closeCallbackRef.current = undefined;
    onClosed();
  }, [phase]);

  function openMenu(
    event: ReactMouseEvent<HTMLButtonElement>,
    menu: "issues" | "search" | "tableOfContents",
  ) {
    clearOpenFrame();
    clearCloseTimer();
    clearSearchFocusTimer();
    closeCallbackRef.current = undefined;
    triggerRef.current = event.currentTarget;
    const source = window.matchMedia("(min-width: 768px)").matches
      ? "desktop_sticky"
      : "mobile_sticky";
    trackPublicAnalyticsEvent(
      menu === "issues"
        ? publicAnalyticsEvents.issueSwitcherOpen
        : menu === "search"
          ? publicAnalyticsEvents.searchOpen
          : publicAnalyticsEvents.issueTableOfContentsOpen,
      { item_count: menu === "issues" ? issues.length : items.length, source },
    );
    setActiveMenu(menu);
    setMenuPhase("opening");
    openFrameRef.current = window.requestAnimationFrame(() => {
      openFrameRef.current = null;
      if (phaseRef.current !== "opening") return;

      setMenuPhase("open");
      if (menu === "search") {
        searchFocusTimerRef.current = window.setTimeout(() => {
          searchFocusTimerRef.current = null;
          if (phaseRef.current === "open") {
            searchInputRef.current?.focus({ preventScroll: true });
          }
        }, getMotionDuration());
      }
    });
  }

  function finishClose() {
    if (phaseRef.current === "closed") return;

    clearCloseTimer();
    setMenuPhase("closed");
    setActiveMenu(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function closeMenu(onClosed?: () => void) {
    if (phaseRef.current === "closed" || phaseRef.current === "closing") return;

    clearOpenFrame();
    clearSearchFocusTimer();
    closeCallbackRef.current = onClosed;
    const duration = getMotionDuration();

    if (duration === 0) {
      finishClose();
      return;
    }

    setMenuPhase("closing");
    closeTimerRef.current = window.setTimeout(finishClose, duration + 50);
  }

  function navigateTo(itemId: string) {
    closeMenu(() => {
      window.history.pushState(null, "", `#${itemId}`);
      document.getElementById(itemId)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  }

  function navigateSearchResult(href: string) {
    const target = new URL(href, window.location.href);
    const current = new URL(window.location.href);

    setSearchValue("");
    closeMenu(() => {
      if (target.origin !== current.origin) {
        window.location.assign(target.href);
        return;
      }

      if (target.pathname === current.pathname && target.search === current.search && target.hash) {
        window.history.pushState(null, "", `${target.pathname}${target.search}${target.hash}`);
        document.getElementById(decodeURIComponent(target.hash.slice(1)))?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
        return;
      }

      router.push(`${target.pathname}${target.search}${target.hash}`);
    });
  }

  function renderTableOfContentsTrigger() {
    return (
      <button
        type="button"
        aria-controls={tableOfContentsMenuId}
        aria-expanded={visible && activeMenu === "tableOfContents"}
        aria-label={i18n.public.home.dossier.tableOfContentsOpen}
        onClick={(event) => openMenu(event, "tableOfContents")}
        className="inline-flex min-h-10 cursor-pointer items-center gap-2 px-2 font-ui text-[11px] font-bold tracking-[0.1em] text-foreground uppercase decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) hover:text-accent hover:underline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        <List size={18} strokeWidth={2.5} aria-hidden="true" />
        <span>{i18n.public.home.dossier.tableOfContentsMenuTitle}</span>
      </button>
    );
  }

  function renderIssuesTrigger() {
    return (
      <button
        type="button"
        aria-controls={issuesMenuId}
        aria-expanded={visible && activeMenu === "issues"}
        aria-label={i18n.public.home.dossier.issueSwitcherOpen}
        onClick={(event) => openMenu(event, "issues")}
        className="inline-flex min-h-10 min-w-0 max-w-[calc(100%-5.5rem)] cursor-pointer items-center gap-1 px-2 font-ui text-[11px] font-bold tracking-[0.1em] text-foreground uppercase decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) hover:text-accent hover:underline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        <span className="shrink-0 tabular-nums">{issueNumber}</span>
        <span aria-hidden="true">-</span>
        <span className="truncate">{issueTitle}</span>
      </button>
    );
  }

  function renderSearchTrigger() {
    return (
      <button
        type="button"
        aria-controls={searchMenuId}
        aria-expanded={visible && activeMenu === "search"}
        aria-label={i18n.public.home.dossier.searchOpen}
        onClick={(event) => openMenu(event, "search")}
        className="inline-flex min-h-10 cursor-pointer items-center gap-2 px-2 font-ui text-[11px] font-bold tracking-[0.1em] text-foreground uppercase decoration-1 underline-offset-4 transition-colors duration-(--motion-fast) hover:text-accent hover:underline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        <Search size={18} strokeWidth={2.5} aria-hidden="true" />
        <span>{i18n.public.home.dossier.searchTitle}</span>
      </button>
    );
  }

  const isIssuesMenu = activeMenu === "issues";
  const isSearchMenu = activeMenu === "search";
  const navigation = (
    <div
      data-public-issue-navigation
      className="sticky top-[var(--public-header-height)] z-40 h-[var(--public-issue-nav-height)] overflow-hidden border-b border-foreground bg-background text-foreground"
    >
      <div
        data-page-reveal="navigation"
        className="h-full"
        style={{ "--page-reveal-delay": "0ms" } as CSSProperties}
      >
        <div className={`${publicContentClassName} flex h-full items-center justify-between`}>
          {renderIssuesTrigger()}
          <div className="flex items-center gap-1">
            {renderSearchTrigger()}
            {renderTableOfContentsTrigger()}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {navigation}
      {visible
        ? createPortal(
            <div
              className={cn(
                "fixed inset-0 z-120 touch-none overscroll-contain bg-foreground/60 transition-opacity md:bg-foreground/80",
                open ? "opacity-100" : "opacity-0",
              )}
              style={{ transitionDuration: `${getMotionDuration()}ms` }}
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) closeMenu();
              }}
            >
              <div
                id={menuId}
                role="dialog"
                aria-modal="true"
                aria-label={
                  isIssuesMenu
                    ? i18n.public.home.dossier.issueSwitcherTitle
                    : isSearchMenu
                      ? i18n.public.home.dossier.searchTitle
                      : i18n.public.home.dossier.tableOfContentsLabel
                }
                className={cn(
                  "absolute flex touch-pan-y overflow-hidden overscroll-contain bg-background text-foreground transition-transform ease-out",
                  isSearchMenu
                    ? "inset-x-0 top-0 max-h-[min(32rem,80dvh)] flex-col border-b-2 border-foreground"
                    : "inset-y-0 w-full flex-col md:w-[min(32rem,42vw)]",
                  isIssuesMenu && "left-0 border-r border-foreground",
                  activeMenu === "tableOfContents" && "right-0 border-l border-foreground",
                  open
                    ? "translate-x-0 translate-y-0"
                    : isSearchMenu
                      ? "-translate-y-full"
                      : isIssuesMenu
                        ? "-translate-x-full"
                        : "translate-x-full",
                )}
                style={{ transitionDuration: `${getMotionDuration()}ms` }}
                onTransitionEnd={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    event.propertyName === "transform" &&
                    phaseRef.current === "closing"
                  ) {
                    finishClose();
                  }
                }}
              >
                <header className="flex min-h-16 items-center justify-between gap-4 border-b-2 border-foreground px-4 sm:px-6 md:px-8">
                  <h2 className="font-heading text-(length:--text-lg) leading-[1.2] font-bold tracking-[-0.025em]">
                    {isIssuesMenu
                      ? i18n.public.home.dossier.issueSwitcherTitle
                      : isSearchMenu
                        ? i18n.public.home.dossier.searchTitle
                        : i18n.public.home.dossier.tableOfContentsMenuTitle}
                  </h2>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => closeMenu()}
                    aria-label={
                      isIssuesMenu
                        ? i18n.public.home.dossier.issueSwitcherClose
                        : isSearchMenu
                          ? i18n.public.home.dossier.searchClose
                          : i18n.public.home.dossier.tableOfContentsClose
                    }
                    className="flex size-11 cursor-pointer items-center justify-center focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <X size={24} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </header>
                {isSearchMenu ? (
                  <div className="px-4 py-5 sm:px-6 md:px-8">
                    <label htmlFor={`${searchMenuId}-input`} className="sr-only">
                      {i18n.public.home.dossier.searchTitle}
                    </label>
                    <input
                      ref={searchInputRef}
                      id={`${searchMenuId}-input`}
                      type="search"
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder={i18n.public.home.dossier.searchPlaceholder}
                      className="h-14 w-full appearance-none border-b-2 border-foreground bg-transparent px-0 font-heading text-[clamp(24px,4vw,42px)] leading-none font-bold tracking-[-0.035em] text-foreground outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none focus-visible:border-accent"
                    />
                    <div className="mt-5 max-h-[calc(min(32rem,80dvh)-11.5rem)] overflow-y-auto pr-1">
                      <PublicSearchMenuResults
                        query={searchValue}
                        onNavigate={navigateSearchResult}
                      />
                    </div>
                  </div>
                ) : (
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
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
