import { forwardRef } from "react";

import { publicHeaderButtonClassName } from "@/components/public/header/constants";
import { PublicMenuIcon } from "@/components/public/header/public-menu-icon";
import { publicTypography } from "@/components/public/primitives";
import { cn } from "@/lib/utils";

type PublicMenuButtonProps = {
  label: string;
  ariaLabel: string;
  icon: "menu" | "close";
  tone?: "light" | "dark";
  expanded?: boolean;
  controls?: string;
  onClick: () => void;
  className?: string;
};

export const PublicMenuButton = forwardRef<HTMLButtonElement, PublicMenuButtonProps>(
  function PublicMenuButton(
    { label, ariaLabel, icon, tone = "light", expanded, controls, onClick, className },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={expanded}
        aria-controls={controls}
        onClick={onClick}
        className={cn(
          publicHeaderButtonClassName,
          icon === "close" ? "p-0" : "px-0 py-1.5",
          tone === "dark" ? "text-background" : "text-foreground",
          className,
        )}
      >
        <span className={cn(publicTypography.label, "text-[17px]")}>{label}</span>
        <PublicMenuIcon variant={icon} />
      </button>
    );
  },
);
