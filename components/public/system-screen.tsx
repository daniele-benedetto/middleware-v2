import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type PublicSystemScreenProps = {
  code: string;
  title: string;
  description: string;
  kicker?: string;
  actions?: ReactNode;
};

export function PublicSystemScreen({
  code,
  title,
  description,
  kicker,
  actions,
}: PublicSystemScreenProps) {
  return (
    <section className="flex flex-1 items-center border-b-2 border-foreground py-16">
      <div
        className={`${publicContentClassName} grid items-center gap-y-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-x-12`}
      >
        <div className="flex min-w-0 items-center md:justify-end">
          <span aria-hidden className={cn(publicTypography.systemCode, "text-accent")}>
            {code}
          </span>
        </div>

        <div className="min-w-0 border-l-[3px] border-accent pl-6 sm:pl-8">
          {kicker ? (
            <p className={cn("mb-4 text-accent", publicTypography.kicker)}>{kicker}</p>
          ) : null}
          <h1 className={cn("max-w-[12ch] text-foreground", publicTypography.systemTitle)}>
            {title}
          </h1>
          <p className="mt-6 max-w-[48ch] font-editorial text-[19px] leading-normal text-body-text italic">
            {description}
          </p>
          {actions ? (
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">{actions}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
