import type { ReactNode } from "react";

type CmsLayoutShellProps = {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
};

export function CmsLayoutShell({ sidebar, topbar, children }: CmsLayoutShellProps) {
  return (
    <div className="bg-background text-foreground md:h-dvh md:max-h-dvh md:overflow-hidden">
      <div className="grid grid-cols-[280px_1fr] max-md:grid-cols-1 md:h-full">
        <aside className="border-r-[3px] border-foreground md:sticky md:top-0 md:h-full md:max-h-full md:overflow-y-auto max-md:border-r-0 max-md:border-b-[3px]">
          {sidebar}
        </aside>
        <div className="flex flex-col max-md:min-h-screen md:h-full md:min-h-0">
          <header className="shrink-0 border-b-[3px] border-foreground">{topbar}</header>
          <main className="flex min-h-0 flex-1 flex-col p-6 max-md:p-4 md:overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
