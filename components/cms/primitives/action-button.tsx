import { type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { cmsActionButtonVariants } from "@/lib/cms/ui/variants";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type CmsActionButtonProps = {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
} & VariantProps<typeof cmsActionButtonVariants>;

export function CmsActionButton({
  children,
  className,
  isLoading = false,
  tone,
  type = "button",
  disabled,
  onClick,
}: CmsActionButtonProps) {
  return (
    <Button
      type={type}
      onClick={onClick}
      className={cn(cmsActionButtonVariants({ tone }), className)}
      data-loading={isLoading}
      disabled={disabled ?? isLoading}
    >
      {children}
    </Button>
  );
}
