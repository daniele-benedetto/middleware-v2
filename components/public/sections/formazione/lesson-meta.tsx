import { PublicMetaRail } from "@/components/public/compounds";
import { i18n } from "@/lib/i18n";

import type { PublicCourseLessonSummaryDto } from "@/lib/server/modules/courses/dto/public";

type LessonMetaProps = {
  lesson: PublicCourseLessonSummaryDto;
  tone?: "light" | "dark" | "accent";
};

export function LessonMeta({ lesson, tone = "light" }: LessonMetaProps) {
  const text = i18n.public.coursePage;
  const muted =
    tone === "dark" ? "text-dark-muted" : tone === "accent" ? "text-cream-muted" : "text-muted";
  const separator = tone === "accent" ? "bg-foreground" : "bg-accent";
  const items = [
    { key: "reading-time", label: text.readingTimeLabel(lesson.readingTimeMinutes) },
    lesson.hasAudio ? { key: "audio", label: text.audioLabel } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));

  return (
    <PublicMetaRail
      items={items}
      className={`flex flex-wrap items-center gap-3 font-heading text-xs font-semibold ${muted}`}
      separatorClassName={separator}
    />
  );
}
