import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { StyledTitle } from "@/components/public/styled-title";

type IssuesArchiveHeroProps = {
  title: string;
  description: string;
  totalLabel: string;
};

export function IssuesArchiveHero({ title, description, totalLabel }: IssuesArchiveHeroProps) {
  return (
    <section className="relative isolate w-full overflow-hidden bg-background">
      <div className={`${publicContentClassName} relative py-7 sm:py-9 lg:py-14`}>
        <div className="relative z-10 w-full">
          <h1 className={`${publicTypography.homeHeroTitle} w-full text-foreground`}>
            <StyledTitle title={title} />
          </h1>
          <div className="mt-8 w-full border-t-2 border-foreground pt-5">
            <p className="font-editorial text-[clamp(18px,1.8vw,25px)] leading-[1.36] text-body-text italic">
              {description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 font-heading text-[13px] font-semibold text-muted sm:text-[14px]">
              <span>{totalLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
