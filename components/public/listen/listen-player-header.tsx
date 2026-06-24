type ListenPlayerHeaderProps = {
  title: string;
  excerpt: string | null;
};

export function ListenPlayerHeader({ title, excerpt }: ListenPlayerHeaderProps) {
  return (
    <div>
      <p className="font-heading text-[11px] font-extrabold tracking-[0.16em] text-accent uppercase">
        Audiolettura
      </p>
      <h1 className="mt-3 font-heading text-[clamp(34px,5.4vw,72px)] leading-[0.88] font-black tracking-[-0.055em]">
        {title}
      </h1>
      {excerpt ? (
        <p className="mt-5 border-t-2 border-foreground pt-4 font-editorial text-[clamp(17px,1.7vw,22px)] leading-[1.32] text-body-text italic">
          {excerpt}
        </p>
      ) : null}
    </div>
  );
}
