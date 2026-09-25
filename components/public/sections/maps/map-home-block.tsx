"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { courseVariantClasses } from "@/components/public/course-variant";
import { publicInteraction, publicTypography } from "@/components/public/primitives";
import { MapHomeCanvas } from "@/components/public/sections/maps/map-home-canvas";
import { StyledTitle } from "@/components/public/styled-title";
import { i18n } from "@/lib/i18n";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { cn } from "@/lib/utils";

import type { MapHomeBlock as MapHomeBlockData } from "@/components/public/home/home-view-model";

function MobileMapMenu({
  items,
  activeItemId,
  title,
  onSelect,
}: {
  items: MapHomeBlockData["map"]["items"];
  activeItemId: string | null;
  title: string;
  onSelect: (itemId: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setVisible(false);
      buttonRef.current?.focus();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      inertElements.forEach((element) => {
        element.inert = false;
      });
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [visible]);

  const activeItem = items.find((item) => item.id === activeItemId) ?? items[0];
  if (!activeItem) return null;

  function selectItem(itemId: string) {
    onSelect(itemId);
    setVisible(false);
    buttonRef.current?.focus();
  }

  return (
    <div className="border-b border-foreground bg-background md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-controls={menuId}
        aria-expanded={visible}
        aria-label={i18n.public.maps.selectItemAriaLabel}
        onClick={() => setVisible(true)}
        className={cn(
          publicInteraction.cardSurface,
          "flex min-h-16 w-full items-center justify-end gap-4 px-4 py-4 text-left text-foreground focus-visible:outline-offset-[-3px] sm:px-6",
        )}
      >
        <span className="flex size-9 items-center justify-center" aria-hidden="true">
          <Menu size={26} strokeWidth={2.5} />
        </span>
      </button>
      {visible
        ? createPortal(
            <div
              id={menuId}
              role="dialog"
              aria-modal="true"
              aria-label={i18n.public.maps.itemsSelectionDialogAriaLabel}
              className="fixed inset-0 z-120 flex flex-col border-l border-foreground bg-background text-foreground"
            >
              <header className="flex min-h-16 items-center justify-between gap-4 border-b-2 border-foreground px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:px-6">
                <h2 className="line-clamp-2 min-w-0 font-heading text-(length:--text-lg) leading-[1.2] font-bold tracking-[-0.025em]">
                  {title}
                </h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => {
                    setVisible(false);
                    buttonRef.current?.focus();
                  }}
                  aria-label={i18n.public.maps.closeItemsList}
                  className="flex size-9 shrink-0 items-center justify-center focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <X size={26} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </header>
              <nav
                aria-label={i18n.public.maps.itemsListAriaLabel}
                className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]"
              >
                {items.map((item) => {
                  const selected = item.id === activeItem.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={selected ? "true" : undefined}
                      onClick={() => selectItem(item.id)}
                      className={cn(
                        publicInteraction.cardSurface,
                        "relative min-h-16 w-full border-b border-b-foreground border-l border-l-transparent px-4 py-5 text-left focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-[-3px] sm:px-6",
                        selected
                          ? "border-l-accent bg-surface-hover text-foreground"
                          : "bg-background text-foreground",
                      )}
                    >
                      <span className="font-ui text-[12px] leading-[1.25] font-bold tracking-[0.03em] uppercase">
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function MapItemList({
  items,
  activeItemId,
  onSelect,
}: {
  items: MapHomeBlockData["map"]["items"];
  activeItemId: string | null;
  onSelect: (itemId: string) => void;
}) {
  const listRef = useRef<HTMLElement>(null);

  function selectItem(itemId: string, item: HTMLButtonElement) {
    const list = listRef.current;
    if (list) {
      const listBounds = list.getBoundingClientRect();
      const itemBounds = item.getBoundingClientRect();
      list.scrollTo({
        top: list.scrollTop + itemBounds.top - listBounds.top,
        behavior: "smooth",
      });
    }
    onSelect(itemId);
  }

  return (
    <aside className="hidden min-h-0 flex-col bg-background md:absolute md:inset-y-0 md:left-0 md:flex md:w-1/3 md:border-r md:border-foreground">
      <nav
        ref={listRef}
        aria-label={i18n.public.maps.itemsListAriaLabel}
        className="flex min-h-0 flex-1 overflow-x-auto md:flex-col md:overflow-y-auto"
      >
        {items.map((item) => {
          const selected = item.id === activeItemId;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={selected ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                selectItem(item.id, event.currentTarget);
              }}
              className={cn(
                publicInteraction.cardSurface,
                "relative min-w-55 border-b border-r border-foreground px-6 py-5 text-left last:border-b-0 last:border-r-0 focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-[-3px] md:min-w-0 md:border-x-0 md:px-8 md:py-6",
                selected
                  ? "bg-surface-hover text-foreground shadow-(--interactive-rail-shadow)"
                  : "bg-background text-foreground",
              )}
            >
              <span className="line-clamp-3 block font-ui text-[11px] leading-[1.25] font-bold tracking-[0.03em] uppercase">
                {item.title}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export function MapHomeBlock({ block }: { block: MapHomeBlockData }) {
  const description = extractPlainText(block.map.descriptionRich);
  const variant = courseVariantClasses[block.map.homeVariant];
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  return (
    <section className="scroll-mt-[var(--public-issue-anchor-offset)] py-10 md:py-12">
      <div className="w-full md:mx-auto md:max-w-384 md:px-12">
        <div className="overflow-hidden border-y border-foreground md:border">
          <header
            className={cn(variant.surface, variant.border, "border-b p-4 sm:p-6 md:p-8 lg:p-10")}
          >
            <h2 className={`${publicTypography.featureArticleTitle} max-w-[14ch] ${variant.title}`}>
              <StyledTitle
                title={block.map.title}
                titleStyled={block.map.titleStyled}
                primaryClassName={variant.titlePrimary}
              />
            </h2>
            {description ? (
              <p className={`${publicTypography.dossierDescription} mt-5 ${variant.description}`}>
                {description}
              </p>
            ) : null}
          </header>
          <div className="relative grid md:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
            <MobileMapMenu
              items={block.map.items}
              activeItemId={selectedItemId}
              title={block.map.title}
              onSelect={setSelectedItemId}
            />
            <MapItemList
              items={block.map.items}
              activeItemId={selectedItemId}
              onSelect={setSelectedItemId}
            />
            <div
              className={cn(
                "relative z-0 min-h-105 min-w-0 overflow-hidden bg-muted md:col-start-2 md:min-h-130 md:max-h-160 md:border-l",
                variant.border,
              )}
            >
              <MapHomeCanvas
                map={block.map}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
