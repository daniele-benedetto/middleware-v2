import { questionnaireColumnClass } from "@/components/public/questionnaires/questionnaire-ui";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function QuestionnaireProgressHeader({
  label,
  position,
  answered,
  total,
}: {
  label: string;
  position: string;
  answered: number;
  total: number;
}) {
  const questionProgress = i18n.public.questionnaire.questionProgress(answered, total);
  const percentage = total > 0 ? (answered / total) * 100 : 0;

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className={cn(questionnaireColumnClass, "pt-3 pb-4 sm:pt-4")}>
        <p className="flex h-7 items-center truncate font-heading text-[15px] leading-none font-extrabold tracking-[-0.01em] text-foreground">
          {position}
        </p>
        <div
          aria-label={label || position}
          aria-valuemax={Math.max(total, 1)}
          aria-valuemin={0}
          aria-valuenow={answered}
          aria-valuetext={`${questionProgress} · ${position}`}
          className="mt-2 h-1 bg-foreground/15"
          role="progressbar"
        >
          <div
            className="h-full bg-accent transition-[width] duration-(--motion-base) ease-(--easing-standard)"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <div className="border-b border-foreground/15" />
    </header>
  );
}
