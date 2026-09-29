"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CmsActionButton } from "@/components/cms/primitives";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { trpc } from "@/lib/trpc/react";

export function PrintEditionRowActions({ id }: { id: string }) {
  const router = useRouter();
  const duplicate = trpc.printEditions.duplicate.useMutation({
    onSuccess: (edition) => router.push(cmsCrudRoutes.printEditions.edit(edition.id)),
  });
  const remove = trpc.printEditions.delete.useMutation({
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Link
        href={cmsCrudRoutes.printEditions.edit(id)}
        className="inline-flex border border-foreground px-3 py-2 font-ui text-[10px] font-extrabold tracking-[0.08em] uppercase hover:bg-card-hover"
      >
        Modifica
      </Link>
      <Link
        href={cmsCrudRoutes.printEditions.preview(id)}
        className="inline-flex border border-foreground px-3 py-2 font-ui text-[10px] font-extrabold tracking-[0.08em] uppercase hover:border-accent hover:bg-accent hover:text-background"
      >
        Preview
      </Link>
      <CmsActionButton
        type="button"
        variant="outline"
        size="xs"
        isLoading={duplicate.isPending}
        onClick={() => duplicate.mutate({ id })}
      >
        Duplica
      </CmsActionButton>
      <CmsActionButton
        type="button"
        variant="outline-accent"
        size="xs"
        isLoading={remove.isPending}
        onClick={() => {
          if (window.confirm("Eliminare definitivamente questa edizione?")) {
            remove.mutate({ id });
          }
        }}
      >
        Elimina
      </CmsActionButton>
    </div>
  );
}
