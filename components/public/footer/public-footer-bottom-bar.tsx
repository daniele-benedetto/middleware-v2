import { publicContentClassName } from "@/components/public/primitives";
import { publicFeatures } from "@/lib/public/config";

type PublicFooterBottomBarProps = {
  legal: string;
  issueMeta: string;
};

export function PublicFooterBottomBar({ legal, issueMeta }: PublicFooterBottomBarProps) {
  return (
    <div className="border-t border-dark-line">
      <div
        className={`${publicContentClassName} grid grid-cols-1 gap-4 py-4.5 text-xs text-footer-muted sm:grid-cols-3`}
      >
        <span>{legal}</span>
        <span className="sm:text-center">v{publicFeatures.version}</span>
        <span className="sm:text-right">{issueMeta}</span>
      </div>
    </div>
  );
}
