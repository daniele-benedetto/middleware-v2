import type { ReactNode } from "react";

type CmsLayoutShellProps = {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
};

export function CmsLayoutShell({ sidebar, topbar, children }: CmsLayoutShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[280px_1fr] max-md:grid-cols-1">
        <aside className="h-screen max-h-screen overflow-y-auto border-r-[3px] border-foreground md:sticky md:top-0 max-md:h-auto max-md:max-h-none max-md:overflow-visible max-md:border-r-0 max-md:border-b-[3px]">
          {sidebar}
        </aside>
        <div className="flex min-h-screen flex-col">
          <header className="border-b-[3px] border-foreground">{topbar}</header>
          <main className="flex-1 p-6 max-md:p-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
