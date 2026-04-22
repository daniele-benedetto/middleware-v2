import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";

import { CmsEyebrow, CmsHeading } from "@/components/cms/primitives/typography";
import { cn } from "@/lib/utils";

const editorialCardVariants = cva(
  "ui-surface block border-[3px] p-4 transition-colors focus-visible:outline-none",
  {
    variants: {
      tone: {
        default: "border-foreground bg-background hover:bg-secondary",
        accent: "border-foreground bg-accent text-primary-foreground hover:bg-accent/90",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

const editorialLabelVariants = cva("", {
  variants: {
    tone: {
      default: "text-accent",
      accent: "text-primary-foreground/75",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const editorialTitleVariants = cva("mt-2", {
  variants: {
    tone: {
      default: "text-foreground",
      accent: "text-primary-foreground",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const editorialCtaVariants = cva(
  "mt-4 inline-flex border px-2.5 py-1 font-ui text-[11px] uppercase tracking-[0.08em]",
  {
    variants: {
      tone: {
        default: "border-foreground text-foreground",
        accent: "border-primary-foreground text-primary-foreground",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

type CmsEditorialCardProps = {
  href: string;
  label: string;
  title: string;
  ctaLabel?: string;
} & VariantProps<typeof editorialCardVariants>;

export function CmsEditorialCard({
  href,
  label,
  title,
  ctaLabel = "Apri sezione",
  tone = "default",
}: CmsEditorialCardProps) {
  return (
    <Link href={href} className={cn(editorialCardVariants({ tone }))}>
      <CmsEyebrow
        className={cn(editorialLabelVariants({ tone }))}
        tone={tone === "accent" ? "onAccent" : "accent"}
      >
        {label}
      </CmsEyebrow>
      <CmsHeading
        className={cn(editorialTitleVariants({ tone }))}
        size="section"
        tone={tone === "accent" ? "onAccent" : "foreground"}
      >
        {title}
      </CmsHeading>
      <span className={cn(editorialCtaVariants({ tone }))}>{ctaLabel}</span>
    </Link>
  );
}
