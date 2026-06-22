export const publicInteraction = {
  cardBase:
    "group cursor-pointer transition-[background,box-shadow] duration-(--motion-fast) focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent",
  cardSurface:
    "group cursor-pointer transition-[background,box-shadow] duration-(--motion-fast) focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent hover:bg-surface-hover hover:shadow-(--interactive-rail-shadow)",
  imageZoom:
    "transition-transform duration-(--motion-slow) ease-(--easing-standard) group-hover:scale-[1.035] group-focus-visible:scale-[1.035]",
} as const;
