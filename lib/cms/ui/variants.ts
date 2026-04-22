import { cva } from "class-variance-authority";

export const cmsFieldLabelClass = "font-ui text-xs uppercase tracking-[0.08em] text-foreground";

export const cmsFieldHintClass = "text-sm text-muted-foreground";

export const cmsFieldErrorClass = "font-ui text-xs uppercase tracking-[0.06em] text-accent";

export const cmsInputClass =
  "h-9 rounded-none border-foreground bg-background font-ui text-[11px] uppercase tracking-[0.08em] text-foreground placeholder:text-muted-foreground focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30 disabled:border-border disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100 aria-invalid:border-accent aria-invalid:ring-3 aria-invalid:ring-accent/30";

export const cmsTextareaClass =
  "min-h-24 rounded-none border-foreground bg-background font-editorial text-[16px] leading-[1.55] text-foreground placeholder:text-muted-foreground focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30 disabled:border-border disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100 aria-invalid:border-accent aria-invalid:ring-3 aria-invalid:ring-accent/30";

export const cmsSelectTriggerClass =
  "h-9 rounded-none border-foreground bg-background font-ui text-[11px] uppercase tracking-[0.08em] text-foreground data-placeholder:text-muted-foreground focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30 disabled:border-border disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100 aria-invalid:border-accent aria-invalid:ring-3 aria-invalid:ring-accent/30";

export const cmsActionButtonVariants = cva(
  "h-8 rounded-none border font-ui text-[11px] uppercase tracking-[0.08em] transition-colors focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30 disabled:border-border disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100 data-[loading=true]:cursor-progress data-[loading=true]:opacity-80",
  {
    variants: {
      tone: {
        primary: "border-foreground bg-foreground text-primary-foreground hover:bg-primary/90",
        secondary: "border-foreground bg-background text-foreground hover:bg-secondary",
        danger: "border-foreground bg-accent text-primary-foreground hover:bg-accent/90",
      },
    },
    defaultVariants: {
      tone: "secondary",
    },
  },
);
