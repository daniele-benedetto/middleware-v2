export function ListenEmptyState() {
  return (
    <div className="flex h-full min-h-65 items-center">
      <div className="max-w-2xl">
        <p className="font-heading text-[11px] font-extrabold tracking-[0.16em] text-accent uppercase">
          Solo audio
        </p>
        <p className="mt-4 font-editorial text-[clamp(28px,5vw,64px)] leading-[1.05] tracking-[-0.035em] text-cream-on-dark">
          Il testo sincronizzato non è disponibile per questo articolo.
        </p>
      </div>
    </div>
  );
}
