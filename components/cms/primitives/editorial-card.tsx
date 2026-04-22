import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";

import { CmsDisplay, CmsMetaText } from "@/components/cms/primitives/typography";
import { cn } from "@/lib/utils";

const editorialCardVariants = cva(
  "group block border border-foreground transition-colors focus-visible:outline-none",
  {
    variants: {
      tone: {
        default: "bg-background hover:bg-[color:var(--bg-hover)]",
        accent: "border-accent bg-accent text-white hover:brightness-[0.93]",
      },
      density: {
        compact: "px-[16px] py-[14px]",
        comfortable: "px-[20px] py-[18px]",
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
  ctaLabel = "Apri sezione",
  meta,
  tone = "default",
  density,
  className,
}: CmsEditorialCardProps) {
  const resolvedTone = tone ?? "default";
  const isAccent = resolvedTone === "accent";

  return (
    <Link
      href={href}
      className={cn(editorialCardVariants({ tone: resolvedTone, density }), className)}
    >
      <CmsMetaText
        variant="category"
        className={cn("block mb-[7px]", isAccent && "!text-white/80")}
      >
        {label}
      </CmsMetaText>

      <CmsDisplay
        as="h3"
        size="h2"
        tone={cardTitleToneMap[resolvedTone]}
        className={cn(
          "!text-[18px] !leading-[1.1] !tracking-[-0.02em] mb-[9px]",
          "group-hover:underline group-hover:decoration-accent group-hover:underline-offset-[4px]",
          isAccent && "group-hover:decoration-white",
        )}
      >
        {title}
      </CmsDisplay>

      {meta ? (
        <CmsMetaText variant="meta" className={cn("block", isAccent && "!text-white/70")}>
          {meta}
        </CmsMetaText>
      ) : null}

      <span
        className={cn(
          "mt-[14px] inline-flex border px-[12px] py-[7px] font-ui text-[12px] uppercase tracking-[0.04em]",
          isAccent
            ? "border-white text-white"
            : "border-foreground text-foreground group-hover:border-accent group-hover:text-accent",
        )}
      >
        → {ctaLabel}
      </span>
    </Link>
  );
}
