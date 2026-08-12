"use client";

import { LoaderCircle, MapPin, Search } from "lucide-react";
import { useDeferredValue, useEffect, useId, useState } from "react";

import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

type MapAddressSearchProps = {
  onSelect: (address: { latitude: number; longitude: number }) => void;
};

export function CmsMapAddressSearch({ onSelect }: MapAddressSearchProps) {
  const listId = useId();
  const mapText = i18n.cms.forms.resources.maps;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const deferredQuery = useDeferredValue(query.trim());
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(deferredQuery), 700);
    return () => window.clearTimeout(timeout);
  }, [deferredQuery]);
  const addressSearch = trpc.maps.searchAddress.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 3, staleTime: 30_000 },
  );
  const results = addressSearch.data ?? [];

  const selectAddress = (address: (typeof results)[number]) => {
    setQuery(address.label);
    setIsOpen(false);
    onSelect(address);
  };

  return (
    <div className="relative z-500 w-full max-w-xl">
      <div className="flex h-12 items-center gap-3 rounded-[6px] border border-foreground bg-card px-3 shadow-lg">
        <Search aria-hidden className="shrink-0 text-accent" size={18} />
        <input
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={isOpen && results.length > 0}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
              event.preventDefault();
              selectAddress(results[activeIndex]);
            }
          }}
          placeholder={mapText.addressSearchPlaceholder}
          className="min-w-0 flex-1 bg-transparent font-editorial text-[16px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        {addressSearch.isFetching ? (
          <LoaderCircle
            aria-label="Ricerca in corso"
            className="animate-spin text-muted-foreground"
            size={16}
          />
        ) : null}
      </div>
      {isOpen && debouncedQuery.length >= 3 ? (
        <div
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+4px)] right-0 left-0 max-h-72 overflow-y-auto rounded-[6px] border border-foreground bg-card p-1 shadow-xl"
        >
          {results.map((address, index) => (
            <button
              id={`${listId}-${index}`}
              key={`${address.latitude}-${address.longitude}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className={`flex w-full items-start gap-3 rounded-[4px] px-3 py-3 text-left font-editorial text-[15px] leading-[1.3] text-foreground focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-accent ${activeIndex === index ? "bg-accent/10" : "hover:bg-surface-hover"}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectAddress(address)}
            >
              <MapPin aria-hidden className="mt-0.5 shrink-0 text-accent" size={16} />
              {address.label}
            </button>
          ))}
          {!addressSearch.isFetching && results.length === 0 && !addressSearch.isError ? (
            <p className="px-3 py-3 font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {mapText.addressSearchEmpty}
            </p>
          ) : null}
          {addressSearch.isError ? (
            <p className="px-3 py-3 font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Ricerca indirizzi non disponibile.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
