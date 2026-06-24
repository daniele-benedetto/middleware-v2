import Link from "next/link";

import { cn } from "@/lib/utils";

type CmsPreviewToolbarAction = {
  label: string;
  href: string;
  external?: boolean;
  disabled?: boolean;
  reload?: boolean;
};

type CmsPreviewToolbarProps = {
  resourceLabel: string;
  title: string;
  statusLabel: string;
  editHref: string;
  refreshHref: string;
  publicHref?: string;
  publicAvailable?: boolean;
};

function ToolbarAction({
  action,
  primary,
}: {
  action: CmsPreviewToolbarAction;
  primary?: boolean;
}) {
  const className = cn(
    "inline-flex h-9 items-center border px-3 font-ui text-[11px] font-extrabold tracking-[0.08em] uppercase transition-colors",
    action.disabled && "cursor-not-allowed opacity-55",
    primary
      ? "border-white bg-white text-black hover:bg-zinc-200"
      : "border-white/35 bg-transparent text-white hover:bg-white/10",
  );

  if (action.disabled) {
    return <span className={className}>{action.label}</span>;
  }

  if (action.external || action.reload) {
    return (
      <a
        href={action.href}
        target={action.external ? "_blank" : undefined}
        rel={action.external ? "noreferrer" : undefined}
        className={className}
      >
        {action.label}
      </a>
    );
  }

  return (
    <Link href={action.href} className={className}>
      {action.label}
    </Link>
  );
}

export function CmsPreviewToolbar({
  resourceLabel,
  title,
  statusLabel,
  editHref,
  refreshHref,
  publicHref,
  publicAvailable,
}: CmsPreviewToolbarProps) {
  const publicAction = publicHref
    ? {
        label: publicAvailable ? "Apri pagina pubblica" : "Pagina pubblica non disponibile",
        href: publicHref,
        external: publicAvailable,
        disabled: !publicAvailable,
      }
    : null;

  return (
    <aside className="sticky top-0 z-50 border-b border-white/15 bg-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
      <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 font-ui text-[10px] font-extrabold tracking-[0.12em] uppercase text-white/70">
            <span className="border border-white bg-white px-2 py-1 text-black">
              Modalita preview
            </span>
            <span>{resourceLabel}</span>
            <span aria-hidden>·</span>
            <span>{statusLabel}</span>
            <span aria-hidden>·</span>
            <span>Visibile solo nel CMS</span>
          </div>
          <p className="truncate font-heading text-base font-black tracking-[-0.02em] sm:text-lg">
            {title}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ToolbarAction action={{ label: "Torna alla modifica", href: editHref }} primary />
          <ToolbarAction
            action={{ label: "Aggiorna anteprima", href: refreshHref, reload: true }}
          />
          {publicAction ? <ToolbarAction action={publicAction} /> : null}
        </div>
      </div>
    </aside>
  );
}
