import { ArrowRight, Check } from "lucide-react";

import { PublicBrand } from "@/components/public/header/public-brand";
import { PublicLink } from "@/components/public/public-link";

export function QuestionnaireFinishScreen({
  title,
  message,
  actionLabel,
  actionHref,
}: {
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 items-center bg-background py-14 focus:outline-none sm:py-20"
    >
      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="mb-6">
          <PublicBrand eager />
        </div>
        <div className="border-t-[3px] border-accent bg-card p-6 sm:p-10">
          <div
            className="flex size-13 items-center justify-center bg-foreground text-background"
            aria-hidden
          >
            <Check className="size-7" />
          </div>
          <h1 className="mt-8 max-w-[14ch] font-heading text-[clamp(38px,6vw,68px)] leading-[0.88] font-black tracking-[-0.055em] text-foreground">
            {title}
          </h1>
          <p className="mt-6 max-w-[52ch] font-editorial text-[20px] leading-relaxed text-body-text">
            {message}
          </p>
          <PublicLink
            href={actionHref}
            className="mt-9 inline-flex items-center gap-2 bg-foreground px-5 py-3 font-ui text-[12px] font-bold tracking-[0.08em] text-background uppercase transition-colors hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent"
          >
            {actionLabel}
            <ArrowRight className="size-4" aria-hidden />
          </PublicLink>
        </div>
      </section>
    </main>
  );
}
