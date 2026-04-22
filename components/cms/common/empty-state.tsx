type CmsEmptyStateProps = {
  title: string;
  description: string;
};

export function CmsEmptyState({ title, description }: CmsEmptyStateProps) {
  return (
    <div className="ui-surface border border-[#0A0A0A] bg-[#F0E8D8] p-6 text-center">
      <h3 className="font-display text-[24px] leading-[0.9] tracking-[-0.03em] text-[#0A0A0A]">
        {title}
      </h3>
      <p className="mt-3 text-[16px] leading-[1.55] text-[rgba(10,10,10,0.6)]">{description}</p>
    </div>
  );
}
