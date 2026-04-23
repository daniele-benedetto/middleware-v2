"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";

import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export type CmsAccordionItem = {
  value: string;
  numeral?: string;
  title: string;
  content: ReactNode;
};

type CmsAccordionProps = {
  items: CmsAccordionItem[];
  defaultValue?: string[];
  className?: string;
};

const ROMAN_TOKENS: Array<[number, string]> = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

function toRomanNumeral(input: number): string {
  let n = input;
  let result = "";
  for (const [value, symbol] of ROMAN_TOKENS) {
    while (n >= value) {
      result += symbol;
      n -= value;
    }
  }
  return result;
}

function resolveNumeral(item: CmsAccordionItem, index: number): string {
  if (item.numeral) return item.numeral;
  return `${toRomanNumeral(index + 1)}.`;
}

export function CmsAccordion({ items, defaultValue, className }: CmsAccordionProps) {
  return (
    <AccordionPrimitive.Root
      defaultValue={defaultValue}
      className={cn("flex w-full flex-col border border-foreground", className)}
    >
      {items.map((item, index) => (
        <AccordionPrimitive.Item
          key={item.value}
          value={item.value}
          className="border-b border-foreground last:border-b-0"
        >
          <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
              className={cn(
                "group flex flex-1 cursor-pointer items-center justify-between px-4.5 py-3.5 text-left",
                "bg-(--bg-main) text-foreground transition-colors",
                "aria-expanded:bg-foreground aria-expanded:text-white",
                "focus-visible:outline-3 focus-visible:outline-accent focus-visible:-outline-offset-2",
              )}
            >
              <span className="flex items-baseline gap-2.5">
                <span className="font-ui text-[11px] leading-none text-accent">
                  {resolveNumeral(item, index)}
                </span>
                <span className="font-display text-[14px] uppercase leading-none tracking-[-0.01em]">
                  {item.title}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "ml-3 shrink-0 font-ui text-[14px] leading-none",
                  "text-border group-aria-expanded:text-white/60",
                )}
              >
                <span className="group-aria-expanded:hidden">+</span>
                <span className="hidden group-aria-expanded:inline">−</span>
              </span>
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Panel
            className={cn(
              "overflow-hidden",
              "data-open:animate-accordion-down data-closed:animate-accordion-up",
            )}
          >
            <div
              className={cn(
                "h-(--accordion-panel-height) data-ending-style:h-0 data-starting-style:h-0",
                "border-t border-foreground bg-background px-4.5 py-4",
                "font-editorial text-[16px] leading-[1.65] text-foreground",
              )}
            >
              {item.content}
            </div>
          </AccordionPrimitive.Panel>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
