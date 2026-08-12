"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  CmsActionButton,
  CmsFormField,
  CmsPageHeader,
  CmsRichTextEditor,
  CmsStyledTitleEditor,
  cmsToast,
  createStyledTitleValue,
  getStyledTitlePlainText,
  hasStyledTitleFormatting,
} from "@/components/cms/primitives";
import { CmsMapPreview } from "@/features/cms/maps/components/map-preview";
import { useMapCreate, type CreateMapInput } from "@/features/cms/maps/hooks/use-map-crud";
import { type MapCoordinates } from "@/features/cms/maps/utils/coordinates";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { createMapInputSchema } from "@/lib/server/modules/maps/schema";
import { trpc } from "@/lib/trpc/react";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };
const initialMapCoordinates: MapCoordinates = { latitude: 44.6578, longitude: 10.9006 };

export function CmsMapCreateScreen() {
  const router = useRouter();
  const trpcUtils = trpc.useUtils();
  const text = i18n.cms;
  const mapText = text.forms.resources.maps;
  const createMutation = useMapCreate();
  const [titleStyled, setTitleStyled] = useState(() => createStyledTitleValue(""));
  const [initialItemCoordinates, setInitialItemCoordinates] = useState(initialMapCoordinates);
  const form = useForm<CreateMapInput>({
    resolver: zodResolver(createMapInputSchema),
    defaultValues: { title: "", descriptionRich: emptyContentDoc },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const map = await createMutation.mutateAsync({
        ...values,
        titleStyled: hasStyledTitleFormatting(titleStyled) ? titleStyled : null,
        initialItem: {
          title: values.title,
          ...initialItemCoordinates,
        },
      });
      await invalidateAfterCmsMutation(trpcUtils, "maps.create", { id: map.id });
      cmsToast.success(mapText.created);
      startTransition(() => {
        router.push(cmsCrudRoutes.maps.edit(map.id));
        router.refresh();
      });
    } catch (error) {
      const mapped = mapTrpcErrorToCmsUiMessage(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsPageHeader
        title={mapText.createTitle}
        actions={
          <div className="flex items-center gap-2">
            <CmsActionButton
              variant="outline"
              onClick={() => router.push("/cms/maps")}
              disabled={createMutation.isPending}
            >
              <X aria-hidden />
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={createMutation.isPending}>
              <Plus aria-hidden />
              {text.forms.create}
            </CmsActionButton>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_minmax(18rem,1fr)] gap-6 lg:pr-6">
          <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto">
            <CmsFormField
              label={text.forms.fields.title}
              htmlFor="map-title"
              hint={mapText.titleStyledHint}
              error={form.formState.errors.title?.message}
              required
            >
              <CmsStyledTitleEditor
                id="map-title"
                value={titleStyled}
                onChange={(nextTitleStyled) => {
                  setTitleStyled(nextTitleStyled);
                  form.setValue("title", getStyledTitlePlainText(nextTitleStyled), {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                placeholder={text.forms.fields.title}
                accentLabel={mapText.titleStyledAccentAction}
                lineBreakLabel={mapText.titleStyledLineBreakAction}
                ariaLabel={mapText.titleStyledEditorAriaLabel}
              />
              <input type="hidden" {...form.register("title")} />
            </CmsFormField>

            <CmsFormField label={text.forms.fields.description} htmlFor="map-description-rich">
              <Controller
                name="descriptionRich"
                control={form.control}
                render={({ field }) => (
                  <CmsRichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    ariaLabel={mapText.descriptionEditorAriaLabel}
                    fullHeight
                  />
                )}
              />
            </CmsFormField>
          </div>

          <CmsMapPreview
            coordinates={initialItemCoordinates}
            onCoordinatesChange={setInitialItemCoordinates}
          />
        </div>

        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <div className="rounded-[6px] border border-dashed border-border px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {mapText.creationHint}
          </div>
        </div>
      </div>
    </form>
  );
}
