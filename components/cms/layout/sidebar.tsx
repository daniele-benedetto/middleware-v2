"use client";

import { ChevronsUpDown, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { CmsActionButton, CmsDisplay } from "@/components/cms/primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useVisibleNavigation } from "@/features/cms/navigation/hooks/use-visible-navigation";
import { authClient } from "@/lib/auth-client";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { UserRole } from "@/lib/server/auth/roles";

type CmsSidebarProps = {
  role: UserRole;
  userName?: string | null;
  userEmail: string;
};

export function CmsSidebar({ role, userName, userEmail }: CmsSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const text = i18n.cms.navigation;
  const visibleNavigation = useVisibleNavigation(role);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const mobileSheetRef = useRef<HTMLDivElement | null>(null);

  const isActive = (href: string) => {
    if (href === "/cms") return pathname === "/cms";
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      router.replace("/cms/login");
      router.refresh();
    } catch {
      window.location.href = "/cms/login";
    } finally {
      setIsSigningOut(false);
    }
  };

  const brandBlock = (
    <div className="flex items-center gap-3">
      <Image
        src="/brand/middleware-logo.svg"
        alt="Middleware logo"
        width={34}
        height={34}
        className="size-8 shrink-0 object-contain"
        priority
      />
      <CmsDisplay as="h3" size="h3" className="text-foreground">
        Middleware
      </CmsDisplay>
    </div>
  );

  const navigationLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1">
      {visibleNavigation.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative block border-l-4 py-3 pl-4 pr-3",
              "font-ui text-[11px] uppercase tracking-[0.08em] transition-colors",
              active
                ? "border-accent bg-card-hover text-accent"
                : "border-transparent text-foreground hover:border-foreground hover:bg-card-hover",
            )}
          >
            {item.label}
            {item.adminOnly ? (
              <span className="ml-2 text-muted-foreground">{text.adminSuffix}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const renderUserMenu = (container?: React.RefObject<HTMLElement | null>) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group flex w-full items-center gap-3 border border-foreground bg-transparent px-3 py-3 text-left",
          "transition-colors hover:bg-card-hover",
          "data-popup-open:border-accent data-popup-open:bg-card-hover data-popup-open:text-accent",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate font-ui text-[12px] uppercase tracking-[0.08em] text-foreground">
            {userName?.trim() || "Utente"}
          </div>
          <div className="truncate font-ui text-[10px] tracking-[0.04em] text-muted-foreground">
            {userEmail}
          </div>
        </div>
        <ChevronsUpDown
          className="size-3.5 shrink-0 text-muted-foreground transition-colors group-data-popup-open:text-accent"
          aria-hidden
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={4}
        container={container}
        className="w-(--anchor-width)"
      >
        <DropdownMenuItem
          disabled={isSigningOut}
          onClick={() => {
            void handleSignOut();
          }}
        >
          {isSigningOut ? "Logout..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="h-full bg-background">
      <div className="hidden h-full flex-col justify-between gap-6 p-5 md:flex">
        <div className="flex flex-col gap-6">
          {brandBlock}
          {navigationLinks()}
        </div>

        <div className="border-t-[3px] border-foreground pt-5">{renderUserMenu()}</div>
      </div>

      <div className="flex items-center justify-between gap-4 p-5 md:hidden">
        {brandBlock}
        <CmsActionButton
          variant="outline"
          size="xs"
          onClick={() => setIsMenuOpen(true)}
          aria-label="Apri menu"
        >
          <Menu className="size-3.5" />
          Menu
        </CmsActionButton>
      </div>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent ref={mobileSheetRef} side="left" className="w-full max-w-80">
          <div className="flex items-center justify-between gap-4 border-b-[3px] border-foreground p-5">
            <SheetTitle className="sr-only">Menu CMS</SheetTitle>
            <SheetDescription className="sr-only">
              Navigazione del pannello CMS e accesso al profilo.
            </SheetDescription>
            {brandBlock}
            <SheetClose
              aria-label="Chiudi menu"
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center border border-foreground bg-transparent",
                "transition-colors hover:bg-card-hover",
              )}
            >
              <X className="size-3.5" aria-hidden />
            </SheetClose>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-6 overflow-y-auto p-5">
            {navigationLinks(() => setIsMenuOpen(false))}
            <div className="border-t-[3px] border-foreground pt-5">
              {renderUserMenu(mobileSheetRef)}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
