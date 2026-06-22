export const publicInteraction = {
  cardBase:
    "group cursor-pointer transition-[background,box-shadow] duration-(--motion-fast) focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent",
  cardSurface:
    "group cursor-pointer transition-[background,box-shadow] duration-(--motion-fast) focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent md:hover:bg-surface-hover md:hover:shadow-(--interactive-rail-shadow)",
  imageZoom:
    "transition-transform duration-(--motion-slow) ease-(--easing-standard) md:group-hover:scale-[1.035] group-focus-visible:scale-[1.035]",
} as const;
