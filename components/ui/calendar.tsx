"use client";

import { it } from "date-fns/locale";
import { DayPicker, type DayPickerProps } from "react-day-picker";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      locale={it}
      navLayout="around"
      showOutsideDays={showOutsideDays}
      className={cn("bg-white", className)}
      classNames={{
        root: "w-full",
        months: "flex flex-col gap-0",
        month: "grid grid-cols-[2rem_minmax(0,1fr)_2rem] grid-rows-[auto_auto]",
        month_caption: "col-start-2 row-start-1 border-b border-foreground px-3 py-2",
        caption_label:
          "text-center font-ui text-[11px] uppercase tracking-[0.08em] text-foreground flex items-center justify-center",
        chevron: "size-3.5 text-foreground",
        nav: "contents",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "col-start-1 row-start-1 h-full w-8 self-stretch rounded-none border-t-0 border-r border-b border-l-0 border-foreground bg-white p-0 text-foreground hover:bg-card-hover hover:text-foreground",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon-xs" }),
          "col-start-3 row-start-1 h-full w-8 justify-self-end self-stretch rounded-none border-t-0 border-r-0 border-b border-l border-foreground bg-white p-0 text-foreground hover:bg-card-hover hover:text-foreground",
        ),
        month_grid: "col-span-3 row-start-2 w-full border-collapse px-3 py-3",
        weekdays: "grid grid-cols-7 border-b border-border",
        weekday:
          "flex h-7 items-center justify-center font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground",
        weeks: "space-y-1 px-3 py-3",
        week: "grid grid-cols-7 gap-1",
        day: "flex items-center justify-center [&[data-selected=true]>button]:border-accent [&[data-selected=true]>button]:bg-accent [&[data-selected=true]>button]:text-white [&[data-selected=true]>button:hover]:border-accent [&[data-selected=true]>button:hover]:bg-accent [&[data-selected=true]>button:hover]:text-white",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "h-10 w-full rounded-none border border-transparent p-0 font-ui text-[11px] text-foreground",
          "hover:border-foreground hover:bg-card-hover hover:text-foreground",
          "focus-visible:border-accent focus-visible:ring-0",
        ),
        selected:
          "[&>button]:border-accent [&>button]:bg-accent [&>button]:text-white [&>button:hover]:border-accent [&>button:hover]:bg-accent [&>button:hover]:text-white",
        today: "[&>button]:border-foreground",
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
