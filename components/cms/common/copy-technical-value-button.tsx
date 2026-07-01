"use client";

type CopyTechnicalValueButtonProps = {
  label: string;
  value?: string | null;
};

export function CopyTechnicalValueButton({ label, value }: CopyTechnicalValueButtonProps) {
  if (!value) return null;

  return (
    <button
      className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      type="button"
      onClick={() => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          void navigator.clipboard.writeText(value).catch(() => undefined);
        }
      }}
    >
      {label}: {value}
    </button>
  );
}
