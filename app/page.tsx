export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-6 py-12">
      <section className="ui-surface border-[3px] border-[#0A0A0A] bg-[#F0E8D8] p-6">
        <p className="font-ui text-[11px] uppercase tracking-[0.08em] text-[#C8001A]">
          Middleware CMS
        </p>
        <h1 className="font-display mt-3 text-[36px] leading-[0.9] tracking-[-0.03em] text-[#0A0A0A]">
          Frontend in setup
        </h1>
        <p className="mt-4 text-[19px] leading-[1.67] text-[#0A0A0A]">
          Design system and tRPC integration are ready. Next step is the CMS shell and modules.
        </p>
      </section>
    </main>
  );
}
