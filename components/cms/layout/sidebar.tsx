"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CmsEyebrow, CmsHeading } from "@/components/cms/primitives";
import { cmsEyebrowClassName } from "@/components/cms/primitives/typography";
import { useVisibleNavigation } from "@/features/cms/navigation/hooks/use-visible-navigation";
import { i18n } from "@/lib/i18n";

import type { UserRole } from "@/lib/server/auth/roles";

type CmsSidebarProps = {
  role: UserRole;
};

export function CmsSidebar({ role }: CmsSidebarProps) {
  const pathname = usePathname();
  const text = i18n.cms.navigation;
  const visibleNavigation = useVisibleNavigation(role);

  const isActive = (href: string) => {
    if (href === "/cms") {
      return pathname === "/cms";
    }

    return pathname.startsWith(`${href}`);
  };

  return (
    <div className="h-full bg-background p-5">
      <CmsEyebrow tone="accent">{text.brand}</CmsEyebrow>
      <CmsHeading size="section" className="mt-2">
        {text.app}
      </CmsHeading>
      <nav className="mt-6 space-y-2">
        {visibleNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`block border px-3 py-2 ${cmsEyebrowClassName} transition-colors ${
              isActive(item.href)
                ? "border-foreground bg-foreground text-primary-foreground"
                : "border-foreground bg-background text-foreground hover:bg-secondary"
            }`}
          >
            {item.label}
            {item.adminOnly ? ` ${text.adminSuffix}` : ""}
          </Link>
        ))}
      </nav>
    </div>
  );
}
