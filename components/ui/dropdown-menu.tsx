"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";

import { cn } from "@/lib/utils";

import type { ComponentProps } from "react";

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({ className, ...props }: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" className={cn(className)} {...props} />
  );
}

type DropdownMenuContentProps = MenuPrimitive.Positioner.Props & {
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  container?: ComponentProps<typeof MenuPrimitive.Portal>["container"];
};

function DropdownMenuContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  alignOffset = 0,
  collisionPadding = 8,
  container,
  children,
  ...props
}: DropdownMenuContentProps) {
  return (
    <MenuPrimitive.Portal container={container}>
      <MenuPrimitive.Positioner
        data-slot="dropdown-menu-positioner"
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        {...props}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 min-w-44 border border-foreground bg-background text-foreground",
            "outline-none data-open:animate-in data-open:fade-in-0",
            className,
          )}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 border-l-4 border-transparent py-3 pl-4 pr-3",
        "font-ui text-[11px] uppercase tracking-[0.08em] text-foreground",
        "outline-none transition-colors",
        "hover:border-accent hover:bg-card-hover hover:text-accent",
        "data-highlighted:border-accent data-highlighted:bg-card-hover data-highlighted:text-accent",
        "data-disabled:pointer-events-none data-disabled:opacity-50 data-disabled:hover:border-transparent data-disabled:hover:bg-transparent data-disabled:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("h-px bg-foreground/30", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
