export function ListenEmptyState() {
  return (
    <div className="border-t-2 border-foreground pt-6 sm:pt-8">
      <p className="font-heading text-[11px] font-extrabold tracking-[0.16em] text-accent uppercase">
        Solo audio
      </p>
      <p className="mt-4 font-editorial text-[clamp(24px,3.6vw,42px)] leading-[1.12] tracking-[-0.03em] text-body-text italic">
        Il testo sincronizzato non è disponibile per questo articolo.
      </p>
    </div>
  );
}
