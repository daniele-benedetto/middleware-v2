import { publicContentClassName } from "@/components/public/primitives";

type PublicFooterBottomBarProps = {
  legal: string;
  issueMeta: string;
};

export function PublicFooterBottomBar({ legal, issueMeta }: PublicFooterBottomBarProps) {
  return (
    <div className="border-t border-dark-line">
      <div
        className={`${publicContentClassName} flex justify-between gap-4 py-6 text-sm text-dark-text sm:flex-row sm:items-center sm:gap-0`}
      >
        <span>{legal}</span>
        <span className="sm:text-right">{issueMeta}</span>
      </div>
    </div>
  );
}
