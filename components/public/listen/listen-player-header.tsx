export function ListenPlayerHeader() {
  return (
    <div className="flex flex-col gap-2 border-b-2 border-foreground pb-4">
      <p className="font-heading text-[11px] font-extrabold tracking-[0.16em] text-accent uppercase">
        Audiolettura
      </p>
      <h2 className="font-heading text-[clamp(28px,4vw,44px)] leading-[0.92] font-black tracking-[-0.045em]">
        Controlli audio
      </h2>
    </div>
  );
}
