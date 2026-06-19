import { cva, type VariantProps } from "class-variance-authority";

import { Button as ShadcnButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

const cmsButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-panel)] font-ui font-bold transition-all " +
    "focus-visible:ring-0 focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 " +
    "disabled:pointer-events-none disabled:opacity-100 data-[loading=true]:cursor-progress data-[loading=true]:opacity-80",
  {
    variants: {
      variant: {
        primary:
          "border-0 bg-foreground text-background hover:brightness-[0.9] " +
          "disabled:bg-card-hover disabled:text-border",
        "primary-accent":
          "border-0 bg-accent text-background hover:brightness-[0.9] " +
          "disabled:bg-card-hover disabled:text-border",
        outline:
          "border border-foreground bg-transparent text-foreground hover:bg-card-hover " +
          "disabled:border-border disabled:text-border disabled:hover:bg-transparent",
        "outline-accent":
          "border border-accent bg-transparent text-accent hover:bg-card-hover " +
          "disabled:border-border disabled:text-border disabled:hover:bg-transparent",
        ghost:
          "h-auto rounded-none border-0 border-b border-foreground bg-transparent px-0! py-0! text-foreground hover:border-b-accent hover:text-accent " +
          "disabled:border-b-[color:var(--ink-30)] disabled:border-dashed disabled:text-border",
        "ghost-accent":
          "h-auto rounded-none border-0 border-b border-accent bg-transparent px-0! py-0! text-accent hover:brightness-[0.88] " +
          "disabled:border-b-[color:var(--ink-30)] disabled:border-dashed disabled:text-border",
      },
      size: {
        xs: "h-auto px-3 py-1.5 text-[12px]",
        md: "h-auto px-5 py-3 text-[14.5px]",
        lg: "h-auto px-6 py-3.5 text-[15px]",
        full: "h-auto w-full justify-start px-5 py-3.5 text-left text-[14px]",
      },
    },
    compoundVariants: [
      { variant: ["outline", "outline-accent"], size: "xs", class: "py-1.5" },
      { variant: ["outline", "outline-accent"], size: "md", class: "py-2.5" },
      { variant: ["outline", "outline-accent"], size: "lg", class: "py-3.25" },
      { variant: ["outline", "outline-accent"], size: "full", class: "py-3.25" },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type CmsButtonVariant = NonNullable<VariantProps<typeof cmsButtonVariants>["variant"]>;
type CmsButtonSize = NonNullable<VariantProps<typeof cmsButtonVariants>["size"]>;

type LegacyTone = "primary" | "secondary" | "danger";

const legacyToneMap: Record<LegacyTone, CmsButtonVariant> = {
  primary: "primary",
  secondary: "outline",
  danger: "primary-accent",
};

type CmsActionButtonProps = Omit<
  ComponentPropsWithoutRef<typeof ShadcnButton>,
  "children" | "className" | "disabled" | "type" | "size" | "variant"
> & {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  variant?: CmsButtonVariant;
  size?: CmsButtonSize;
  tone?: LegacyTone;
};

export function CmsActionButton({
  children,
  className,
  isLoading = false,
  type = "button",
  disabled,
  onClick,
  variant,
  size,
  tone,
  ...props
}: CmsActionButtonProps) {
  const resolvedVariant: CmsButtonVariant = variant ?? (tone ? legacyToneMap[tone] : "primary");

  return (
    <ShadcnButton
      type={type}
      onClick={onClick}
      className={cn(cmsButtonVariants({ variant: resolvedVariant, size }), className)}
      data-loading={isLoading}
      disabled={disabled ?? isLoading}
      {...props}
    >
      {children}
    </ShadcnButton>
  );
}
