import { cn } from "@/lib/utils";

/** Id of the heading of the current stop (step or review): it receives focus on every move. */
export const questionnaireHeadingId = "questionnaire-step-title";

/** Reading column shared by the header, the form and the intro/finish screens. */
export const questionnaireColumnClass = "mx-auto w-full max-w-2xl px-5 sm:px-6";

/**
 * Type scale of the questionnaire, from the title of a stop down to helper text. Everything a
 * respondent has to read is at least 16px and in sentence case; uppercase is kept for the few
 * short labels that only orient (progress, buttons).
 */
export const questionnaireType = {
  stopTitle:
    "font-heading text-[clamp(30px,6vw,44px)] leading-none font-black tracking-[-0.04em] text-foreground",
  sectionTitle:
    "font-heading text-[22px] leading-[1.15] font-extrabold tracking-[-0.02em] text-foreground",
  question: "font-heading text-[19px] leading-[1.3] font-bold tracking-[-0.01em] sm:text-[21px]",
  body: "font-editorial text-[18px] leading-[1.5] text-body-text",
  help: "font-editorial text-[16px] leading-[1.5] text-muted",
  meta: "font-heading text-[11px] leading-none font-bold tracking-[0.1em] uppercase",
  button: "font-heading text-[13px] leading-none font-bold tracking-[0.08em] uppercase",
} as const;

const focusRingClass =
  "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent";

export const primaryCtaClass = cn(
  "inline-flex min-h-12 items-center justify-center gap-2 bg-foreground px-6 py-3 text-background transition-colors hover:bg-accent disabled:bg-muted",
  questionnaireType.button,
  focusRingClass,
);

export const secondaryCtaClass = cn(
  "inline-flex min-h-12 items-center justify-center gap-2 border border-foreground px-5 py-3 text-foreground transition-colors hover:bg-surface-hover disabled:border-border disabled:text-muted",
  questionnaireType.button,
  focusRingClass,
);

export const optionFocusClass =
  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent";

/** Solid selected state, for the compact cells of a scale. */
export function optionStateClass(selected: boolean) {
  return selected
    ? "border-foreground bg-foreground text-background"
    : "border-foreground text-body-text hover:bg-surface-hover";
}

/**
 * Row of a choice. The selected state thickens the frame with an inset shadow and tints the
 * row, so neither the size of the row nor the weight of its text change when it is picked.
 */
export function choiceOptionClass(selected: boolean) {
  return cn(
    "flex min-h-13 cursor-pointer items-center gap-3 border px-4 py-3 transition-[background-color,border-color,box-shadow]",
    questionnaireType.body,
    "leading-snug",
    optionFocusClass,
    selected
      ? "border-foreground bg-foreground/[0.06] shadow-[inset_0_0_0_1px_var(--ink)]"
      : "border-border hover:border-foreground hover:bg-foreground/[0.03]",
  );
}

export const choiceMarkerClass = "size-5 shrink-0 accent-accent";

/**
 * Text entry. Focus and error states are drawn with an inset shadow instead of a thicker
 * border, so the box never changes size. The text is 18px: below 16px iOS zooms on focus.
 * The scroll margins keep the field clear of the sticky header and footer when the browser
 * brings it into view (focus, on-screen keyboard): scrolling itself is left to the browser.
 */
export function textInputClass(invalid: boolean) {
  return cn(
    "w-full scroll-mt-32 scroll-mb-28 rounded-none border bg-foreground/[0.03] px-4 py-3 outline-none transition-[border-color,box-shadow]",
    questionnaireType.body,
    "placeholder:text-muted focus:border-accent focus:shadow-[inset_0_0_0_1px_var(--accent)]",
    invalid ? "border-accent shadow-[inset_0_0_0_1px_var(--accent)]" : "border-foreground/50",
  );
}

export function isSafeHref(value: string | undefined): value is string {
  if (!value) return false;
  return value.startsWith("/") || /^https?:\/\//.test(value);
}
