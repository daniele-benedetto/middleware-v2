import { cn } from "@/lib/utils";

import type { HTMLAttributes } from "react";

export const publicTypography = {
  brand: "font-heading text-[22px] leading-none font-extrabold tracking-[-0.02em] lowercase",
  footerBrand: "font-heading text-xl leading-none font-extrabold tracking-[-0.02em] lowercase",
  kicker: "font-heading text-xs font-extrabold tracking-[0.12em] uppercase",
  smallKicker: "font-heading text-[11px] font-bold tracking-[0.12em] uppercase",
  label: "font-heading text-[13px] font-extrabold tracking-[0.08em] uppercase",
  meta: "font-heading text-xs font-semibold",
  sectionTitle:
    "font-heading text-[clamp(22px,2.6vw,30px)] leading-none font-black tracking-[-0.02em]",
  homeHeroTitle:
    "font-heading text-[clamp(48px,9.5vw,138px)] leading-[0.86] font-black tracking-[-0.06em]",
  issueBackgroundNumber:
    "font-heading text-[clamp(108px,26vw,390px)] leading-[0.72] font-black tracking-[-0.035em]",
  blockTitle:
    "font-heading text-[clamp(34px,4vw,64px)] leading-[0.9] font-black tracking-[-0.045em] uppercase",
  leadArticleTitle:
    "font-heading text-[clamp(42px,6.6vw,104px)] leading-[0.88] font-black tracking-[-0.052em]",
  featureArticleTitle:
    "font-heading text-[clamp(38px,5vw,76px)] leading-[0.9] font-black tracking-tighter",
  closingPanelTitle:
    "font-heading text-[clamp(34px,4.2vw,68px)] leading-[0.9] font-black tracking-[-0.046em] uppercase",
  closingArticleTitle:
    "font-heading text-[clamp(32px,4.6vw,72px)] leading-[0.92] font-black tracking-[-0.048em]",
  issueCardTitle: "font-heading text-[21px] leading-[1.12] font-bold tracking-[-0.02em]",
  editorialSmall: "font-editorial text-[15px] leading-normal",
  editorialBody: "font-editorial text-[clamp(17px,1.4vw,21px)] leading-normal",
  editorialLead: "font-editorial text-[clamp(17px,1.6vw,21px)] leading-normal",
  articleNumberLg:
    "font-heading text-[40px] leading-[0.78] font-black tracking-[-0.04em] sm:text-[48px] md:text-[56px]",
  articleEyebrow:
    "mt-1.5 block max-w-full text-right font-heading text-[11px] leading-snug font-bold tracking-[0.12em] break-normal whitespace-normal uppercase",
  articleEyebrowWide:
    "mt-1.5 block max-w-full text-right font-heading text-[11px] leading-snug font-bold tracking-[0.14em] break-normal whitespace-normal uppercase",
  systemCode:
    "font-heading text-[clamp(100px,24vw,260px)] leading-[0.78] font-black tracking-[-0.065em]",
  systemTitle:
    "font-heading text-[clamp(44px,8vw,104px)] leading-[0.9] font-black tracking-[-0.045em]",
  menuItem: "font-heading text-[clamp(34px,8vw,82px)] leading-[0.95] font-black tracking-[-0.03em]",
} as const;

export function PublicKicker({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(publicTypography.kicker, className)} {...props} />;
}

export function PublicMetaText({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(publicTypography.meta, className)} {...props} />;
}

export function PublicEditorialText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn(publicTypography.editorialBody, className)} {...props} />;
}
