import { PrintEditionCreateForm } from "@/components/cms/print/print-edition-create-form";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

export const metadata = buildCmsMetadata({
  title: "Nuova edizione cartacea",
  description: "Crea una bozza di edizione cartacea.",
  path: "/cms/print/new",
});

export default function NewPrintEditionPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
      <header className="border-b-2 border-foreground pb-5">
        <p className="font-ui text-[10px] font-extrabold tracking-[0.12em] text-accent uppercase">
          {i18n.cms.navigation.printEditions}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-black tracking-[-0.04em]">Nuova edizione</h1>
      </header>
      <PrintEditionCreateForm />
    </div>
  );
}
