type ListenEmptyStateProps = {
  contentKind?: "article" | "lesson";
};

export function ListenEmptyState({ contentKind = "article" }: ListenEmptyStateProps) {
  const label = contentKind === "lesson" ? "questa lezione" : "questo articolo";

  return (
    <div
      className="flex h-full min-h-0 items-center overflow-hidden border-t-2 border-foreground pt-4 sm:pt-5"
      role="status"
      aria-live="polite"
    >
      <p className="font-editorial text-[clamp(17px,2vw,22px)] leading-tight tracking-[-0.015em] text-body-text italic">
        Il testo sincronizzato non è disponibile per {label}.
      </p>
    </div>
  );
}
