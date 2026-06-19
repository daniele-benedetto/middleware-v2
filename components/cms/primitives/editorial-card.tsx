import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";

import { CmsDisplay, CmsMetaText } from "@/components/cms/primitives/typography";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const editorialCardVariants = cva(
  "group block border-r border-b border-foreground transition-colors focus-visible:outline-none focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-accent",
  {
    variants: {
      tone: {
        default:
          "bg-background hover:bg-surface-hover hover:shadow-[var(--interactive-rail-shadow)]",
        accent: "border-accent bg-accent text-background hover:brightness-[0.93]",
      },
      density: {
        compact: "px-5 py-4.5",
        comfortable: "px-6 py-6",
      },
    },
    defaultVariants: { tone: "default", density: "comfortable" },
  },
);

const cardTitleToneMap = {
  default: "foreground" as const,
  accent: "onAccent" as const,
};

type CmsEditorialCardProps = {
  href: string;
  label: string;
  title: string;
  ctaLabel?: string;
  meta?: string;
  className?: string;
} & VariantProps<typeof editorialCardVariants>;

export function CmsEditorialCard({
  href,
  label,
  title,
  ctaLabel,
  meta,
  tone = "default",
  density,
  className,
}: CmsEditorialCardProps) {
  const text = i18n.cms.common;
  const resolvedTone = tone ?? "default";
  const isAccent = resolvedTone === "accent";
  const resolvedCtaLabel = ctaLabel ?? text.openSection;

  return (
    <Link
      href={href}
      className={cn(editorialCardVariants({ tone: resolvedTone, density }), className)}
    >
      <CmsMetaText
        variant="category"
        className={cn("mb-3.5 block", isAccent && "text-background/80!")}
      >
        {label}
      </CmsMetaText>

      <CmsDisplay
        as="h3"
        size="h2"
        tone={cardTitleToneMap[resolvedTone]}
        className={cn(
          "mb-3 text-[21px]! leading-[1.12]! tracking-[-0.02em]!",
          "group-hover:underline group-hover:decoration-accent group-hover:underline-offset-[4px]",
          isAccent && "group-hover:decoration-background",
        )}
      >
        {title}
      </CmsDisplay>

      {meta ? (
        <CmsMetaText variant="meta" className={cn("block", isAccent && "text-background/70!")}>
          {meta}
        </CmsMetaText>
      ) : null}

      <span
        className={cn(
          "mt-6 inline-flex font-ui text-[12px] font-bold text-accent",
          isAccent ? "text-background" : "group-hover:underline group-hover:underline-offset-[4px]",
        )}
      >
        → {resolvedCtaLabel}
      </span>
    </Link>
  );
}
