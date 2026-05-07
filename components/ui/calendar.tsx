"use client";

import { DayPicker, type DayPickerProps } from "react-day-picker";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("bg-white", className)}
      classNames={{
        root: "w-full",
        months: "flex flex-col gap-0",
        month: "space-y-0",
        month_caption:
          "grid grid-cols-[2rem_1fr_2rem] items-center border-b border-foreground px-3 py-2",
        caption_label:
          "text-center font-ui text-[11px] uppercase tracking-[0.08em] text-foreground",
        chevron: "size-3.5 text-foreground",
        nav: "contents",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "col-start-1 row-start-1 h-8 w-8 rounded-none border-foreground bg-white p-0 text-foreground hover:bg-card-hover hover:text-foreground",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "col-start-3 row-start-1 h-8 w-8 justify-self-end rounded-none border-foreground bg-white p-0 text-foreground hover:bg-card-hover hover:text-foreground",
        ),
        month_grid: "w-full border-collapse px-3 py-3",
        weekdays: "grid grid-cols-7 border-b border-border px-3 pb-2",
        weekday:
          "flex h-7 items-center justify-center font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground",
        weeks: "space-y-1 px-3 py-3",
        week: "grid grid-cols-7 gap-1",
        day: "flex items-center justify-center",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "h-10 w-full rounded-none border border-transparent p-0 font-ui text-[11px] text-foreground",
          "hover:border-foreground hover:bg-card-hover hover:text-foreground",
          "focus-visible:border-accent focus-visible:ring-0",
          "aria-selected:border-accent aria-selected:bg-accent aria-selected:text-white",
          "aria-selected:hover:border-accent aria-selected:hover:bg-accent aria-selected:hover:text-white",
        ),
        selected: "",
        today: "[&>button]:border-foreground [&>button]:bg-card-hover/60",
        outside: "[&>button]:text-border [&>button]:opacity-60",
        disabled:
          "[&>button]:border-transparent [&>button]:text-border [&>button]:opacity-40 [&>button:hover]:bg-transparent [&>button:hover]:text-border",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
