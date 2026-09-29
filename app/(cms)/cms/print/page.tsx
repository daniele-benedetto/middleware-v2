import Link from "next/link";

import { PrintEditionRowActions } from "@/components/cms/print/print-edition-row-actions";
import { prefetchPrintEditions } from "@/lib/cms/trpc/server-prefetch";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.printEditions,
  description: "Gestisci le bozze delle edizioni cartacee.",
  path: "/cms/print",
});

export default async function PrintEditionsPage() {
  const editions = await prefetchPrintEditions();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <header className="border-b-2 border-foreground pb-5">
        <p className="font-ui text-[10px] font-extrabold tracking-[0.12em] text-accent uppercase">
          Preparazione editoriale
        </p>
        <h1 className="mt-2 font-heading text-3xl font-black tracking-[-0.04em]">
          Edizioni cartacee
        </h1>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl font-editorial text-base text-muted-foreground">
            Crea e verifica le composizioni A4 prima della stampa.
          </p>
          <Link
            href="/cms/print/new"
            className="inline-flex border border-foreground bg-foreground px-4 py-2 font-ui text-xs font-bold tracking-[0.08em] text-background uppercase hover:bg-accent"
          >
            Nuova edizione
          </Link>
        </div>
      </header>

      {editions.length === 0 ? (
        <div className="border border-foreground bg-card p-6">
          <p className="font-ui text-xs font-extrabold tracking-[0.1em] uppercase">
            Nessuna edizione
          </p>
          <p className="mt-2 font-editorial text-base text-muted-foreground">
            Le prime edizioni verranno create dalla preparazione dell’issue.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-foreground bg-card">
          <table className="w-full min-w-170 border-collapse text-left">
            <thead className="bg-foreground font-ui text-[10px] font-extrabold tracking-[0.1em] text-background uppercase">
              <tr>
                <th className="p-3">Titolo</th>
                <th className="p-3">Stato</th>
                <th className="p-3">Aggiornata</th>
                <th className="p-3 text-right">Azione</th>
              </tr>
            </thead>
            <tbody>
              {editions.map((edition) => (
                <tr key={edition.id} className="border-t border-foreground">
                  <td className="p-3 font-editorial text-base">{edition.title}</td>
                  <td className="p-3 font-ui text-xs font-bold uppercase">{edition.status}</td>
                  <td className="p-3 font-ui text-xs text-muted-foreground">
                    {new Date(edition.updatedAt).toLocaleDateString("it-IT")}
                  </td>
                  <td className="p-3 text-right">
                    <PrintEditionRowActions id={edition.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
