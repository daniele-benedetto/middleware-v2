import { ArrowRight } from "lucide-react";

import { courseVariantClasses } from "@/components/public/course-variant";
import { publicTypography } from "@/components/public/primitives";
import { StyledTitle } from "@/components/public/styled-title";
import { TrackedPublicLink } from "@/components/public/tracked-public-link";
import { i18n } from "@/lib/i18n/public";
import { publicAnalyticsEvents } from "@/lib/public/analytics";
import { cn } from "@/lib/utils";

import type { QuestionnaireInviteHomeBlock as QuestionnaireInviteHomeBlockData } from "@/components/public/home/home-view-model";
import type { QuestionnaireHomeVariant } from "@/lib/server/modules/questionnaires/schema";

const inviteCtaClasses: Record<QuestionnaireHomeVariant, string> = {
  default: "bg-accent text-background md:hover:bg-foreground",
  red: "bg-foreground text-background md:hover:bg-background md:hover:text-foreground",
  black: "bg-accent text-background md:hover:bg-background md:hover:text-foreground",
};

export function QuestionnaireInviteHomeBlock({
  block,
}: {
  block: QuestionnaireInviteHomeBlockData;
}) {
  const invite = block.questionnaireInvite;
  const variant = courseVariantClasses[invite.homeVariant];
  const text = i18n.public.questionnaireInvite;
  const titleId = `questionnaire-invite-title-${block.id}`;

  return (
    <section
      aria-labelledby={titleId}
      className="scroll-mt-[var(--public-issue-anchor-offset)] py-10 md:py-12"
      data-questionnaire-id={invite.id}
    >
      <div className="w-full md:mx-auto md:max-w-384 md:px-12">
        <div
          className={cn(
            variant.surface,
            variant.border,
            "border-y p-4 sm:p-6 md:border md:p-8 lg:p-10",
          )}
        >
          <p className={cn("mb-5", publicTypography.smallKicker, variant.meta)}>{text.kicker}</p>
          <h2
            id={titleId}
            className={cn(publicTypography.featureArticleTitle, variant.title, "w-full max-w-none")}
          >
            <StyledTitle
              title={invite.title}
              titleStyled={invite.titleStyled}
              primaryClassName={variant.titlePrimary}
            />
          </h2>
          {invite.description ? (
            <p
              className={cn(
                "mt-5 w-full max-w-[72ch]",
                publicTypography.dossierDescription,
                variant.description,
              )}
            >
              {invite.description}
            </p>
          ) : null}
          <div
            className={cn(
              "mt-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-5 border-t-2 pt-5",
              variant.border,
            )}
          >
            <p className={cn(publicTypography.smallKicker, variant.meta)}>
              {text.summary(invite.questionCount, invite.estimatedMinutes)}
            </p>
            <TrackedPublicLink
              href={`/questionari/${invite.slug}`}
              analyticsEventName={publicAnalyticsEvents.contentCardClick}
              analyticsEventData={{
                content_type: "questionnaire",
                slug: invite.slug,
                source: "issue_questionnaire_invite",
                position: "questionnaire_invite",
              }}
              className={cn(
                "inline-flex min-h-12 items-center gap-2 px-5 py-3 font-ui text-[12px] font-bold tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-current",
                inviteCtaClasses[invite.homeVariant],
              )}
            >
              {text.cta}
              <ArrowRight className="size-4" aria-hidden />
            </TrackedPublicLink>
          </div>
        </div>
      </div>
    </section>
  );
}
