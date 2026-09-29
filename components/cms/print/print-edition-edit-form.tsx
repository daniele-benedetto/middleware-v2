"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CmsActionButton,
  CmsCheckbox,
  CmsFormField,
  CmsSelect,
  CmsTextInput,
} from "@/components/cms/primitives";
import { CmsMediaPickerDialog } from "@/features/cms/media/components/media-picker-dialog";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { trpc } from "@/lib/trpc/react";

import type { PrintEditionOverride } from "@/lib/print/edition-schema";
import type { RouterOutputs } from "@/lib/trpc/types";

type PrintEdition = RouterOutputs["printEditions"]["getById"];
type PrintItem = { id: string; title: string; kind: string };

const pageFamilyOptions = [
  "article-opener",
  "text-spread",
  "text-image",
  "image-spread",
  "rupture",
  "course-section",
  "map-plate",
  "questionnaire-analysis",
] as const;

export function PrintEditionEditForm({
  initialData,
  items,
}: {
  initialData: PrintEdition;
  items: PrintItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData.title);
  const [status, setStatus] = useState(initialData.status);
  const [overrides, setOverrides] = useState<PrintEditionOverride[]>(
    initialData.manifest.overrides,
  );
  const [imagePickerItemId, setImagePickerItemId] = useState<string | null>(null);
  const updateMutation = trpc.printEditions.update.useMutation({
    onSuccess: () => router.refresh(),
  });

  return (
    <form
      className="flex max-w-2xl flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        updateMutation.mutate({
          id: initialData.id,
          title: title.trim(),
          status,
          manifest: { ...initialData.manifest, title: title.trim(), overrides },
        });
      }}
    >
      <CmsFormField label="Titolo edizione" htmlFor="print-edition-title" required>
        <CmsTextInput
          id="print-edition-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          tone="editorial"
        />
      </CmsFormField>
      <fieldset className="flex flex-col gap-3 border-t border-foreground pt-5">
        <legend className="font-ui text-[10px] font-extrabold tracking-[0.1em] uppercase">
          Override impaginazione
        </legend>
        {items.map((item) => {
          const override = overrides.find((entry) => entry.itemId === item.id);
          const updateOverride = (patch: Partial<PrintEditionOverride>) => {
            setOverrides((current) => {
              const existing = current.find((entry) => entry.itemId === item.id);
              const next = { ...(existing ?? { itemId: item.id }), ...patch };
              return existing
                ? current.map((entry) => (entry.itemId === item.id ? next : entry))
                : [...current, next];
            });
          };

          return (
            <div key={item.id} className="border border-foreground bg-card p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-editorial text-base">{item.title}</span>
                <span className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
                  {item.kind}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_130px_auto] md:items-end">
                <CmsFormField label="Famiglia pagina" htmlFor={`family-${item.id}`}>
                  <CmsSelect
                    value={override?.preferredFamily ?? ""}
                    placeholder="AUTOMATICA"
                    onValueChange={(value) =>
                      updateOverride({
                        preferredFamily: value as (typeof pageFamilyOptions)[number],
                      })
                    }
                    options={pageFamilyOptions.map((value) => ({
                      value,
                      label: value.replaceAll("-", " "),
                    }))}
                  />
                </CmsFormField>
                <CmsFormField label="Pagina" htmlFor={`page-${item.id}`}>
                  <CmsTextInput
                    id={`page-${item.id}`}
                    type="number"
                    min={1}
                    value={override?.lockedPage?.toString() ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateOverride({ lockedPage: value ? Number(value) : undefined });
                    }}
                    tone="ui"
                    placeholder="AUTO"
                  />
                </CmsFormField>
                <CmsCheckbox
                  label="Escludi"
                  checked={override?.excluded ?? false}
                  accent
                  onChange={(checked) => updateOverride({ excluded: checked })}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-foreground pt-3">
                <CmsActionButton
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setImagePickerItemId(item.id)}
                >
                  {override?.selectedImageUrl ? "Sostituisci immagine" : "Scegli immagine"}
                </CmsActionButton>
                {override?.selectedImageUrl ? (
                  <CmsActionButton
                    type="button"
                    variant="ghost-accent"
                    size="xs"
                    onClick={() => updateOverride({ selectedImageUrl: null })}
                  >
                    Rimuovi asset
                  </CmsActionButton>
                ) : null}
              </div>
            </div>
          );
        })}
      </fieldset>
      <CmsMediaPickerDialog
        open={imagePickerItemId !== null}
        onOpenChange={(open) => {
          if (!open) setImagePickerItemId(null);
        }}
        title="Seleziona asset di stampa"
        description="Scegli un’immagine dalla media library da usare per l’elemento selezionato."
        selectActionLabel="Usa immagine"
        allowedKinds={["image"]}
        onSelectUrl={(url) => {
          if (imagePickerItemId) {
            setOverrides((current) => {
              const existing = current.find((entry) => entry.itemId === imagePickerItemId);
              const next = {
                ...(existing ?? { itemId: imagePickerItemId }),
                selectedImageUrl: url,
              };
              return existing
                ? current.map((entry) => (entry.itemId === imagePickerItemId ? next : entry))
                : [...current, next];
            });
          }
          setImagePickerItemId(null);
        }}
      />
      <CmsFormField label="Stato" htmlFor="print-edition-status" required>
        <CmsSelect
          value={status}
          onValueChange={(value) => setStatus(value as typeof status)}
          options={[
            { value: "DRAFT", label: "Bozza" },
            { value: "IN_REVIEW", label: "In revisione" },
            { value: "APPROVED", label: "Approvata" },
            { value: "EXPORTED", label: "Esportata" },
          ]}
        />
      </CmsFormField>
      <div className="flex flex-wrap items-center gap-2">
        <CmsActionButton
          type="submit"
          disabled={!title.trim()}
          isLoading={updateMutation.isPending}
        >
          Salva edizione
        </CmsActionButton>
        <Link
          href={cmsCrudRoutes.printEditions.preview(initialData.id)}
          className="inline-flex items-center border border-foreground px-4 py-2.5 font-ui text-sm font-bold hover:bg-card-hover"
        >
          Apri preview
        </Link>
      </div>
      {updateMutation.isError ? (
        <p className="font-ui text-xs font-bold uppercase tracking-[0.08em] text-accent">
          Salvataggio non riuscito. Riprova.
        </p>
      ) : null}
    </form>
  );
}
