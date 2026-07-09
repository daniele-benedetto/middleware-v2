import { publicHeaderBarClassName } from "@/components/public/header/constants";
import { PublicBrand } from "@/components/public/header/public-brand";
import { PublicMenuController } from "@/components/public/header/public-menu-controller";
import { cn } from "@/lib/utils";

import type { PublicMenuItem } from "@/components/public/header/public-fullscreen-menu";

type PublicHeaderProps = {
  className?: string;
  menuItems: PublicMenuItem[];
};

export function PublicHeader({ className, menuItems }: PublicHeaderProps) {
  return (
    <header
      data-public-header
      className={cn(
        "sticky top-0 z-50 border-b-2 border-foreground bg-background text-foreground",
        "transition-[background-color,border-color,color] duration-(--motion-slow) ease-(--easing-standard)",
        className,
      )}
    >
      <div className={cn(publicHeaderBarClassName, "relative z-130")}>
        <PublicBrand priority />
        <PublicMenuController menuItems={menuItems} />
      </div>
    </header>
  );
}
