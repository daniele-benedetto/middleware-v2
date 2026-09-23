"use client";

import type { MouseEvent, ReactNode } from "react";

type PublicSmoothAnchorProps = {
  href: `#${string}`;
  children: ReactNode;
  className?: string;
};

function scrollToAnchor(id: string) {
  const target = document.getElementById(id);
  if (!target) return;

  const headerHeight =
    document.querySelector<HTMLElement>("[data-public-header]")?.offsetHeight ?? 0;
  const issueNavigationHeight =
    document.querySelector<HTMLElement>("[data-public-issue-navigation]")?.offsetHeight ?? 0;

  window.scrollTo({
    top: Math.max(
      0,
      window.scrollY +
        target.getBoundingClientRect().top -
        headerHeight -
        issueNavigationHeight -
        16,
    ),
    left: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
}

export function PublicSmoothAnchor({ href, children, className }: PublicSmoothAnchorProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const id = decodeURIComponent(href.slice(1));
    if (!document.getElementById(id)) return;

    event.preventDefault();
    window.history.pushState(null, "", href);
    scrollToAnchor(id);
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
