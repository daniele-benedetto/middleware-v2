type PublicMenuIconProps = {
  variant: "menu" | "close";
};

export function PublicMenuIcon({ variant }: PublicMenuIconProps) {
  if (variant === "close") {
    return (
      <span aria-hidden="true" className="relative size-7.5 text-current">
        <span className="absolute top-1/2 left-0 h-0.75 w-7.5 -translate-y-1/2 rotate-45 rounded-[2px] bg-current" />
        <span className="absolute top-1/2 left-0 h-0.75 w-7.5 -translate-y-1/2 -rotate-45 rounded-[2px] bg-current" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="flex w-7.5 flex-col gap-1.25 text-current">
      <span className="h-0.75 rounded-[2px] bg-current" />
      <span className="h-0.75 rounded-[2px] bg-current" />
      <span className="h-0.75 w-5 rounded-[2px] bg-current" />
    </span>
  );
}
