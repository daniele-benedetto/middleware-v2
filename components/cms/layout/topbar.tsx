export function CmsTopbar() {
  return (
    <div className="flex items-center justify-between gap-4 bg-[#F0E8D8] px-5 py-3">
      <p className="font-ui text-[11px] uppercase tracking-[0.08em] text-[rgba(10,10,10,0.6)]">
        Editorial control panel
      </p>
      <span className="font-ui border border-[#0A0A0A] px-2 py-1 text-[11px] uppercase tracking-[0.08em] text-[#0A0A0A]">
        Light mode
      </span>
    </div>
  );
}
