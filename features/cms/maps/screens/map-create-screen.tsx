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
import { useMapCreate, type CreateMapInput } from "@/features/cms/maps/hooks/use-map-crud";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { createMapInputSchema } from "@/lib/server/modules/maps/schema";
import { trpc } from "@/lib/trpc/react";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

export function CmsMapCreateScreen() {
  const router = useRouter();
  const trpcUtils = trpc.useUtils();
  const text = i18n.cms;
  const mapText = text.forms.resources.maps;
  const createMutation = useMapCreate();
  const [titleStyled, setTitleStyled] = useState(() => createStyledTitleValue(""));
  const form = useForm<CreateMapInput>({
    resolver: zodResolver(createMapInputSchema),
    defaultValues: { title: "", descriptionRich: emptyContentDoc },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const map = await createMutation.mutateAsync({
        ...values,
        titleStyled: hasStyledTitleFormatting(titleStyled) ? titleStyled : null,
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

      <div className="cms-scroll flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
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

        <CmsFormField
          label={text.forms.fields.description}
          htmlFor="map-description-rich"
          className="flex min-h-0 flex-1 flex-col"
        >
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
    </form>
  );
}
