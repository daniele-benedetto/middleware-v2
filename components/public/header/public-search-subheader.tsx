"use client";

import { Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { useModalDialog } from "@/components/public/header/use-modal-dialog";
import { publicContentClassName } from "@/components/public/primitives";
import { i18n } from "@/lib/i18n/public";
import { publicAnalyticsEvents, trackPublicAnalyticsEvent } from "@/lib/public/analytics";

// Search results (with their own tRPC/React Query provider) load only when the
// search is about to open, so public pages do not ship that client stack upfront.
const loadSearchMenuResults = () =>
  import("@/components/public/home/issue-search-menu-results").then(
    (mod) => mod.IssueSearchMenuResults,
  );

const SearchMenuResults = dynamic(loadSearchMenuResults, {
  ssr: false,
  loading: () => <div aria-hidden="true" className="min-h-full" />,
});

export function PublicSearchSubheader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const text = i18n.public.home.dossier;
  const isIssuePage = pathname === "/" || pathname.startsWith("/uscite/");

  function close() {
    setOpen(false);
    setQuery("");
  }

  useModalDialog({ open, dialogRef, returnFocusRef: triggerRef, onClose: close });

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  if (isIssuePage) return null;

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
            ref={triggerRef}
            type="button"
            aria-controls={dialogId}
            aria-expanded={open}
            aria-label={text.searchOpen}
            onClick={() => {
              trackPublicAnalyticsEvent(publicAnalyticsEvents.searchOpen, { source: "subheader" });
              setOpen(true);
            }}
            onPointerEnter={() => {
              void loadSearchMenuResults();
            }}
            onFocus={() => {
              void loadSearchMenuResults();
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
          ref={dialogRef}
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
            <SearchMenuResults query={query} onNavigate={navigate} />
          </div>
        </div>
      ) : null}
    </>
  );
}
