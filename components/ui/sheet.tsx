"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-[rgba(10,10,10,0.45)]",
        "transition-opacity duration-200 ease-out",
        "data-starting-style:opacity-0 data-ending-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

const sheetContentVariants = cva(
  "fixed z-50 flex flex-col bg-background text-foreground outline-none transition-transform duration-200 ease-out",
  {
    variants: {
      side: {
        left: [
          "inset-y-0 left-0 h-full w-[85vw] max-w-80 border-r-[3px] border-foreground",
          "data-starting-style:-translate-x-full data-ending-style:-translate-x-full",
        ].join(" "),
        right: [
          "inset-y-0 right-0 h-full w-[85vw] max-w-80 border-l-[3px] border-foreground",
          "data-starting-style:translate-x-full data-ending-style:translate-x-full",
        ].join(" "),
        top: [
          "inset-x-0 top-0 w-full border-b-[3px] border-foreground",
          "data-starting-style:-translate-y-full data-ending-style:-translate-y-full",
        ].join(" "),
        bottom: [
          "inset-x-0 bottom-0 w-full border-t-[3px] border-foreground",
          "data-starting-style:translate-y-full data-ending-style:translate-y-full",
        ].join(" "),
      },
    },
    defaultVariants: { side: "left" },
  },
);

type SheetContentProps = DialogPrimitive.Popup.Props & VariantProps<typeof sheetContentVariants>;

function SheetContent({ className, side, children, ref, ...props }: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Popup
        ref={ref}
        data-slot="sheet-content"
        className={cn(sheetContentVariants({ side }), className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-display text-[15px] uppercase tracking-[0.04em]", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn(
        "font-ui text-[11px] uppercase tracking-[0.08em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
