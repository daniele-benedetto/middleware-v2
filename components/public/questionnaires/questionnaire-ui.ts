import { cn } from "@/lib/utils";

/** Id of the heading of the current stop (step or review): it receives focus on every move. */
export const questionnaireHeadingId = "questionnaire-step-title";

export const primaryCtaClass =
  "inline-flex min-h-12 items-center gap-2 bg-foreground px-5 py-3 font-ui text-[12px] font-bold tracking-[0.08em] text-background uppercase transition-colors hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent";

export const optionFocusClass =
  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent";

export function optionStateClass(selected: boolean) {
  return selected
    ? "border-foreground bg-foreground text-background"
    : "border-foreground bg-card text-body-text hover:bg-surface-hover";
}

export function choiceOptionClass(selected: boolean) {
  return cn(
    "flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 font-editorial text-[18px] leading-snug transition-colors",
    optionFocusClass,
    optionStateClass(selected),
  );
}

export function textInputClass(invalid: boolean) {
  return cn(
    "w-full rounded-none border bg-card px-4 py-3 font-editorial text-[18px] leading-normal text-body-text outline-none transition-colors",
    "placeholder:text-muted focus:border-2 focus:border-accent focus:px-3.75 focus:py-2.75",
    invalid ? "border-2 border-accent px-3.75 py-2.75" : "border-foreground",
  );
}

export function isSafeHref(value: string | undefined): value is string {
  if (!value) return false;
  return value.startsWith("/") || /^https?:\/\//.test(value);
}
