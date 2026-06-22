import { publicContentClassName } from "@/components/public/primitives";

type PublicFooterBottomBarProps = {
  legal: string;
  issueMeta: string;
};

export function PublicFooterBottomBar({ legal, issueMeta }: PublicFooterBottomBarProps) {
  return (
    <div className="border-t border-dark-line">
      <div
        className={`${publicContentClassName} flex flex-wrap justify-between gap-4 py-4.5 text-xs text-footer-muted`}
      >
        <span>{legal}</span>
        <span>{issueMeta}</span>
      </div>
    </div>
  );
}
