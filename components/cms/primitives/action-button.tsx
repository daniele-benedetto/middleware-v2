import { cva, type VariantProps } from "class-variance-authority";

import { Button as ShadcnButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

const cmsButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-[6px] rounded-none font-ui uppercase transition-all outline-none " +
    "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 " +
    "disabled:pointer-events-none data-[loading=true]:cursor-progress data-[loading=true]:opacity-80",
  {
    variants: {
      variant: {
        primary:
          "border-0 bg-foreground text-white tracking-[0.08em] hover:brightness-[0.88] " +
          "disabled:bg-[color:var(--bg-hover)] disabled:text-[color:var(--ink-30)]",
        "primary-accent":
          "border-0 bg-accent text-white tracking-[0.08em] hover:brightness-[0.88] " +
          "disabled:bg-[color:var(--bg-hover)] disabled:text-[color:var(--ink-30)]",
        outline:
          "border border-foreground bg-transparent text-foreground tracking-[0.08em] hover:bg-[color:var(--bg-hover)] " +
          "disabled:border-[color:var(--ink-30)] disabled:text-[color:var(--ink-30)] disabled:hover:bg-transparent",
        "outline-accent":
          "border border-accent bg-transparent text-accent tracking-[0.08em] hover:bg-[color:var(--bg-hover)] " +
          "disabled:border-[color:var(--ink-30)] disabled:text-[color:var(--ink-30)] disabled:hover:bg-transparent",
        ghost:
          "h-auto border-0 border-b border-foreground bg-transparent !px-0 !py-0 text-foreground tracking-[0.06em] hover:border-b-accent hover:text-accent " +
          "disabled:border-b-[color:var(--ink-30)] disabled:border-dashed disabled:text-[color:var(--ink-30)]",
        "ghost-accent":
          "h-auto border-0 border-b border-accent bg-transparent !px-0 !py-0 text-accent tracking-[0.06em] hover:brightness-[0.88] " +
          "disabled:border-b-[color:var(--ink-30)] disabled:border-dashed disabled:text-[color:var(--ink-30)]",
      },
      size: {
        xs: "h-auto px-[14px] py-[7px] text-[10px]",
        md: "h-auto px-[20px] py-[11px] text-[12px]",
        lg: "h-auto px-[28px] py-[14px] text-[13px]",
        full: "h-auto w-full justify-start px-[20px] py-[14px] text-left text-[12px]",
      },
    },
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

type CmsActionButtonProps = {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
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
}: CmsActionButtonProps) {
  const resolvedVariant: CmsButtonVariant = variant ?? (tone ? legacyToneMap[tone] : "primary");

  return (
    <ShadcnButton
      type={type}
      onClick={onClick}
      className={cn(cmsButtonVariants({ variant: resolvedVariant, size }), className)}
      data-loading={isLoading}
      disabled={disabled ?? isLoading}
    >
      {children}
    </ShadcnButton>
  );
}
