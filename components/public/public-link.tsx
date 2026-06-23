import Link from "next/link";

import type { ComponentProps } from "react";

type PublicLinkProps = ComponentProps<typeof Link>;

function shouldDisableNavigationScroll(href: PublicLinkProps["href"]) {
  if (typeof href !== "string") {
    return true;
  }

  return href.startsWith("/") && !href.includes("#");
}

export function PublicLink({ href, scroll, ...props }: PublicLinkProps) {
  return <Link href={href} scroll={scroll ?? !shouldDisableNavigationScroll(href)} {...props} />;
}
