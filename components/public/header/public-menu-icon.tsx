type PublicMenuIconProps = {
  variant: "menu" | "close";
};

export function PublicMenuIcon({ variant }: PublicMenuIconProps) {
  return (
    <span
      aria-hidden="true"
      data-menu-icon={variant}
      className="public-menu-icon relative size-7.5 text-current"
    >
      <span className="public-menu-icon-line public-menu-icon-line-top" />
      <span className="public-menu-icon-line public-menu-icon-line-middle" />
      <span className="public-menu-icon-line public-menu-icon-line-bottom" />
    </span>
  );
}
