"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { PublicSearchMenuResults } from "@/components/public/home/public-search-menu-results";
import { publicContentClassName } from "@/components/public/primitives";
import { i18n } from "@/lib/i18n";
import { publicAnalyticsEvents, trackPublicAnalyticsEvent } from "@/lib/public/analytics";

export function PublicSearchSubheader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogId = useId();
  const text = i18n.public.home.dossier;
  const isIssuePage = pathname === "/" || pathname.startsWith("/uscite/");

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (isIssuePage) return null;

  function close() {
    setOpen(false);
    setQuery("");
  }

  function navigate(href: string) {
    close();
    router.push(href);
  }

  return (
    <>
      <div
        data-public-issue-navigation
        className="sticky top-[var(--public-header-height)] z-40 h-[var(--public-issue-nav-height)] overflow-hidden border-b border-foreground bg-background text-foreground"
      >
        <div className={`${publicContentClassName} flex h-full items-center justify-end`}>
          <button
            type="button"
            aria-controls={dialogId}
            aria-expanded={open}
            aria-label={text.searchOpen}
            onClick={() => {
              trackPublicAnalyticsEvent(publicAnalyticsEvents.searchOpen, { source: "subheader" });
              setOpen(true);
            }}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 px-2 font-ui text-[11px] font-bold tracking-[0.1em] text-foreground uppercase underline-offset-4 transition-colors duration-(--motion-fast) hover:text-accent hover:underline focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <span>{text.searchTitle}</span>
          </button>
        </div>
      </div>

      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="true"
          aria-label={text.searchTitle}
          className="fixed inset-0 z-120 overflow-y-auto bg-background text-foreground"
        >
          <div className="sticky top-0 z-10 border-b-2 border-foreground bg-background">
            <div className={`${publicContentClassName} flex min-h-18 items-center gap-4`}>
              <Search size={20} className="shrink-0 text-accent" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") close();
                }}
                placeholder={text.searchTitle}
                aria-label={text.searchTitle}
                className="min-w-0 flex-1 bg-transparent font-heading text-xl font-bold outline-none placeholder:text-muted"
              />
              <button
                type="button"
                onClick={close}
                aria-label={i18n.public.menu.closeAriaLabel}
                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center text-foreground transition-colors hover:text-accent focus-visible:outline-3 focus-visible:outline-accent"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className={`${publicContentClassName} py-8`}>
            <PublicSearchMenuResults query={query} onNavigate={navigate} />
          </div>
        </div>
      ) : null}
    </>
  );
}
