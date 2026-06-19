type PublicFooterBottomBarProps = {
  legal: string;
  issueMeta: string;
};

export function PublicFooterBottomBar({ legal, issueMeta }: PublicFooterBottomBarProps) {
  return (
    <div className="border-t border-[#2c2926]">
      <div className="flex w-full flex-wrap justify-between gap-4 px-4 py-4.5 text-xs text-[#8d877f] sm:px-6 lg:px-12">
        <span>{legal}</span>
        <span>{issueMeta}</span>
      </div>
    </div>
  );
}
