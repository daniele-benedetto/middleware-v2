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
    <div className="h-full bg-background p-[20px]">
      <CmsMetaText variant="category" className="block">
        {text.brand}
      </CmsMetaText>
      <CmsDisplay as="h2" size="h2" className="mt-[8px]">
        {text.app}
      </CmsDisplay>

      <nav className="mt-[24px] flex flex-col gap-[4px]">
        {visibleNavigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative block pl-[14px] pr-[12px] py-[10px]",
                "font-ui text-[11px] uppercase tracking-[0.08em] transition-colors",
                active
                  ? "bg-[color:var(--bg-hover)] text-accent border-l-[4px] border-accent"
                  : "text-foreground border-l-[4px] border-transparent hover:bg-[color:var(--bg-hover)] hover:border-foreground",
              )}
            >
              {item.label}
              {item.adminOnly ? (
                <span className="ml-[6px] text-[color:var(--ink-60)]">{text.adminSuffix}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
