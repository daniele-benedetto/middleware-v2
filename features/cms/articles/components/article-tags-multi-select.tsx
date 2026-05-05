"use client";

import { Check, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { CmsActionButton, CmsRemovableTag, CmsSearchBar } from "@/components/cms/primitives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type ArticleTagOption = {
  id: string;
  name: string;
  slug: string;
};

type ArticleTagsMultiSelectProps = {
  availableTags: ArticleTagOption[];
  selectedTagIds: string[];
  disabled: boolean;
  loading: boolean;
  loadingText: string;
  emptyText: string;
  searchPlaceholder: string;
  searchEmptyText: string;
  triggerEmptyText: string;
  clearText: string;
  selectedCountText: (count: number) => string;
  onChange: (tagId: string, checked: boolean) => void;
};

export function ArticleTagsMultiSelect({
  availableTags,
  selectedTagIds,
  disabled,
  loading,
  loadingText,
  emptyText,
  searchPlaceholder,
  searchEmptyText,
  triggerEmptyText,
  clearText,
  selectedCountText,
  onChange,
}: ArticleTagsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredTags = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableTags;
    }

    return availableTags.filter((tag) => {
      return (
        tag.name.toLowerCase().includes(normalizedQuery) ||
        tag.slug.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [availableTags, query]);

  const selectedTags = useMemo(() => {
    const selectedIds = new Set(selectedTagIds);
    return availableTags.filter((tag) => selectedIds.has(tag.id));
  }, [availableTags, selectedTagIds]);

  const triggerLabel = loading
    ? loadingText
    : selectedTagIds.length > 0
      ? selectedCountText(selectedTagIds.length)
      : triggerEmptyText;

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              id="article-tags"
              type="button"
              disabled={disabled || loading}
              className={cn(
                "flex min-h-10 w-full items-center justify-between border border-foreground bg-white px-3 text-left",
                "font-ui text-[12px] uppercase tracking-[0.04em] transition-colors hover:bg-card-hover",
                (disabled || loading) &&
                  "cursor-not-allowed border-border bg-card-hover text-border hover:bg-card-hover",
              )}
            />
          }
        >
          <span
            className={selectedTagIds.length > 0 && !loading ? "text-foreground" : "text-border"}
          >
            {triggerLabel}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </PopoverTrigger>

        <PopoverContent className="w-(--anchor-width) max-w-88 border-0 p-0">
          {availableTags.length > 0 ? (
            <CmsSearchBar
              className="border-0 p-0 focus-within:border-0 [&>div]:border-b-0 [&>div>div]:border-r-0 [&>div>div_svg]:text-foreground"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              active={Boolean(query)}
              resultsSlot={
                <div className="max-h-64 overflow-y-auto">
                  {filteredTags.length > 0 ? (
                    filteredTags.map((tag) => {
                      const checked = selectedTagIds.includes(tag.id);

                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => onChange(tag.id, !checked)}
                          className={cn(
                            "flex w-full items-center justify-between border-b border-card-hover px-3.5 py-2 text-left last:border-b-0",
                            "font-ui text-[11px] uppercase tracking-[0.04em]",
                            checked
                              ? "bg-card-hover text-foreground"
                              : "bg-white text-muted-foreground hover:bg-card-hover hover:text-foreground",
                          )}
                        >
                          <span>
                            {tag.name}
                            <span className="ml-2 text-[10px] text-border">{tag.slug}</span>
                          </span>
                          {checked ? <Check className="size-3.5 text-accent" /> : null}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3.5 py-3 font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                      {searchEmptyText}
                    </div>
                  )}
                </div>
              }
            />
          ) : (
            <div className="font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
              {loading ? loadingText : emptyText}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <CmsRemovableTag key={tag.id} onRemove={() => onChange(tag.id, false)}>
              {tag.name}
            </CmsRemovableTag>
          ))}

          {selectedTags.length > 1 ? (
            <CmsActionButton
              variant="ghost"
              size="xs"
              onClick={() => selectedTagIds.forEach((id) => onChange(id, false))}
            >
              {clearText}
            </CmsActionButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
