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
    <section className="flex flex-1 items-center border-b-2 border-foreground px-4 py-16 sm:px-6 lg:px-12">
      <div className="grid w-full items-center gap-y-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-x-12">
        <div className="flex min-w-0 items-center md:justify-end">
          <span
            aria-hidden
            className="font-heading text-[clamp(100px,24vw,260px)] leading-[0.78] font-black tracking-[-0.065em] text-accent"
          >
            {code}
          </span>
        </div>

        <div className="min-w-0 border-l-[3px] border-accent pl-6 sm:pl-8">
          {kicker ? (
            <p className="mb-4 font-heading text-xs font-extrabold tracking-[0.12em] text-accent uppercase">
              {kicker}
            </p>
          ) : null}
          <h1 className="max-w-[12ch] font-heading text-[clamp(44px,8vw,104px)] leading-[0.9] font-black tracking-[-0.045em] text-foreground">
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
