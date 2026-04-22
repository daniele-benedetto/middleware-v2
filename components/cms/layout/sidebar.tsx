"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CmsDisplay, CmsMetaText } from "@/components/cms/primitives";
import { useVisibleNavigation } from "@/features/cms/navigation/hooks/use-visible-navigation";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { UserRole } from "@/lib/server/auth/roles";

type CmsSidebarProps = {
  role: UserRole;
};

export function CmsSidebar({ role }: CmsSidebarProps) {
  const pathname = usePathname();
  const text = i18n.cms.navigation;
  const visibleNavigation = useVisibleNavigation(role);

  const isActive = (href: string) => {
    if (href === "/cms") return pathname === "/cms";
    return pathname.startsWith(href);
  };

  return (
    <div className="h-full bg-background p-5">
      <CmsMetaText variant="category" className="block">
        {text.brand}
      </CmsMetaText>
      <CmsDisplay as="h2" size="h2" className="mt-2">
        {text.app}
      </CmsDisplay>

      <nav className="mt-6 flex flex-col gap-1">
        {visibleNavigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative block pl-3.5 pr-3 py-2.5",
                "font-ui text-[11px] uppercase tracking-[0.08em] transition-colors",
                active
                  ? "bg-card-hover text-accent border-l-[4px] border-accent"
                  : "text-foreground border-l-[4px] border-transparent hover:bg-card-hover hover:border-foreground",
              )}
            >
              {item.label}
              {item.adminOnly ? (
                <span className="ml-1.5 text-muted-foreground">{text.adminSuffix}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
