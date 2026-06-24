"use client";

import Link from "next/link";
import { useTransitionRouter } from "next-view-transitions";

import type { ComponentProps, MouseEvent } from "react";

type PublicLinkProps = ComponentProps<typeof Link>;

function isInternalRoute(href: PublicLinkProps["href"]): href is string {
  return typeof href === "string" && href.startsWith("/") && !href.includes("#");
}

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0 ||
    (event.currentTarget.target ? event.currentTarget.target !== "_self" : false)
  );
}

export function PublicLink({ href, onClick, ...props }: PublicLinkProps) {
  const router = useTransitionRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (event.defaultPrevented || isModifiedEvent(event) || !isInternalRoute(href)) {
      return;
    }

    event.preventDefault();
    // Forward navigation: let Next scroll to top, and reset again once the
    // transition snapshot is ready so the new page never animates in from the
    // previous scroll offset. Back/forward stays native (the provider restores it).
    router.push(href, {
      onTransitionReady: () => window.scrollTo({ top: 0, left: 0, behavior: "instant" }),
    });
  };

  return <Link href={href} onClick={handleClick} {...props} />;
}
