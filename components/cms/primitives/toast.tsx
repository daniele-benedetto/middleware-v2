"use client";

import { toast as sonnerToast } from "sonner";

import { cn } from "@/lib/utils";

type CmsToastVariant = "info" | "breaking" | "error";

type CmsToastRenderProps = {
  id: string | number;
  label: string;
  body: string;
  variant: CmsToastVariant;
};

function CmsToastCard({ id, label, body, variant }: CmsToastRenderProps) {
  const containerClass = cn(
    "flex w-full min-w-80 max-w-120 items-stretch",
    variant === "error"
      ? "bg-foreground text-white"
      : variant === "breaking"
        ? "border border-accent bg-white"
        : "border border-foreground bg-white",
  );

  const barClass = cn(
    "w-1 shrink-0",
    variant === "error" ? "bg-accent" : variant === "breaking" ? "bg-accent" : "bg-foreground",
  );

  const labelClass = cn(
    "mb-1 font-ui text-[10px] uppercase tracking-[0.08em]",
    variant === "error"
      ? "text-white/50"
      : variant === "breaking"
        ? "text-accent"
        : "text-muted-foreground",
  );

  const bodyClass = cn(
    "font-editorial text-[14px] leading-[1.45]",
    variant === "error" ? "text-white" : "text-foreground",
  );

  const closeClass = cn(
    "flex items-center px-3 py-2.5 font-ui text-[12px] cursor-pointer",
    variant === "error" ? "text-white/30 hover:text-white/60" : "text-border hover:text-foreground",
  );

  return (
    <div className={containerClass}>
      <div className={barClass} />
      <div className="flex-1 px-3.5 py-2.5">
        <div className={labelClass}>{label}</div>
        <div className={bodyClass}>{body}</div>
      </div>
      <button
        type="button"
        onClick={() => sonnerToast.dismiss(id)}
        aria-label="Chiudi"
        className={closeClass}
      >
        ×
      </button>
    </div>
  );
}

function showToast(variant: CmsToastVariant, defaultLabel: string, body: string, label?: string) {
  return sonnerToast.custom(
    (id) => <CmsToastCard id={id} label={label ?? defaultLabel} body={body} variant={variant} />,
    { duration: variant === "error" ? 6000 : 4000 },
  );
}

export const cmsToast = {
  info: (body: string, label?: string) => showToast("info", "INFO", body, label),
  breaking: (body: string, label?: string) => showToast("breaking", "BREAKING", body, label),
  error: (body: string, label?: string) => showToast("error", "ERRORE", body, label),
  dismiss: sonnerToast.dismiss,
};
