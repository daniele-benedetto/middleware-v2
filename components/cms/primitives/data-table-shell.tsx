import type { ReactNode } from "react";

type CmsDataTableShellProps = {
  toolbar: ReactNode;
  table: ReactNode;
  pagination: ReactNode;
};

export function CmsDataTableShell({ toolbar, table, pagination }: CmsDataTableShellProps) {
  return (
    <section className="ui-surface border-[3px] border-[#0A0A0A] bg-[#F0E8D8]">
      <div className="border-b border-[#0A0A0A] p-4">{toolbar}</div>
      <div className="overflow-x-auto">{table}</div>
      <div className="border-t border-[#0A0A0A] p-4">{pagination}</div>
    </section>
  );
}
