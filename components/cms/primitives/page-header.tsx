import type { ReactNode } from "react";

type CmsPageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function CmsPageHeader({ title, subtitle, actions }: CmsPageHeaderProps) {
  return (
    <div className="mb-6 border-b-[3px] border-[#0A0A0A] pb-4">
      <div className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div>
          <h1 className="font-display text-2xl leading-[0.9] tracking-[-0.03em]">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-[rgba(10,10,10,0.6)]">{subtitle}</p> : null}
        </div>
        {actions ? (
          <div className="font-ui text-xs uppercase tracking-[0.08em]">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
