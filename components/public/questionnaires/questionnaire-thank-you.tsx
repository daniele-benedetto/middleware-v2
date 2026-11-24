import { ArrowRight } from "lucide-react";

import { PublicLink } from "@/components/public/public-link";
import {
  primaryCtaClass,
  questionnaireColumnClass,
  questionnaireType,
} from "@/components/public/questionnaires/questionnaire-ui";
import { cn } from "@/lib/utils";

export function QuestionnaireThankYou({
  title,
  message,
  actionHref,
  actionLabel,
}: {
  title: string;
  message: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 items-center bg-background py-16 focus:outline-none sm:py-24"
    >
      <section className={questionnaireColumnClass} data-page-reveal="body">
        <h1 className="max-w-[14ch] font-heading text-[clamp(44px,10vw,80px)] leading-[0.9] font-black tracking-[-0.05em] text-foreground">
          {title}
        </h1>
        {message ? (
          <p
            className={cn(
              questionnaireType.body,
              "mt-6 max-w-[48ch] text-[clamp(18px,2.4vw,21px)] whitespace-pre-line",
            )}
          >
            {message}
          </p>
        ) : null}
        <div className="mt-10">
          <PublicLink href={actionHref} className={primaryCtaClass}>
            {actionLabel}
            <ArrowRight className="size-4" aria-hidden />
          </PublicLink>
        </div>
      </section>
    </main>
  );
}
