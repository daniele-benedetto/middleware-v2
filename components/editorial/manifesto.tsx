import { cn } from "@/lib/utils";

type EditorialManifestoProps = {
  quote: string;
  source?: string;
  tone?: "ink" | "accent";
  className?: string;
};

export function EditorialManifesto({
  quote,
  source,
  tone = "ink",
  className,
}: EditorialManifestoProps) {
  const isAccent = tone === "accent";

  return (
    <section
      className={cn(
        "text-center",
        "px-[clamp(18px,4vw,56px)] py-[clamp(28px,4vw,52px)]",
        isAccent ? "bg-accent" : "bg-foreground",
        className,
      )}
    >
      <p
        className={cn(
          "mx-auto max-w-190 font-display italic uppercase text-white",
          "text-[clamp(18px,2.8vw,32px)] leading-(--lh-display-quote) tracking-[-0.02em]",
        )}
      >
        {quote}
      </p>
      {source ? (
        <p className="mt-3 font-ui text-(length:--text-meta) text-white/45">— {source}</p>
      ) : null}
    </section>
  );
}
