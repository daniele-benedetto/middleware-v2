"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CmsConfirmDialog, CmsErrorState } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsFormField,
  CmsPageHeader,
  CmsRichTextEditor,
  CmsTextInput,
  cmsToast,
} from "@/components/cms/primitives";
import { CmsMapItemFormLoading } from "@/features/cms/maps/components/map-item-form-loading";
import { CmsMapPreview } from "@/features/cms/maps/components/map-preview";
import {
  useMapById,
  useMapItemCreate,
  useMapItemDelete,
  useMapItemUpdate,
  type MapDetail,
} from "@/features/cms/maps/hooks/use-map-crud";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { createMapItemInputSchema } from "@/lib/server/modules/maps/schema";
import { trpc } from "@/lib/trpc/react";

import type { MapCoordinates } from "@/features/cms/maps/utils/coordinates";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };
const defaultItemCoordinates: MapCoordinates = { latitude: 44.6578, longitude: 10.9006 };
const mapItemFormSchema = createMapItemInputSchema.omit({ mapId: true });

type MapItemFormInput = z.input<typeof mapItemFormSchema>;
type MapItemFormValues = z.output<typeof mapItemFormSchema>;
type CmsMapItemFormScreenProps = {
  mode: "create" | "edit";
  mapId: string;
  itemId?: string;
  initialMap?: MapDetail;
  initialCoordinates?: MapCoordinates;
};

function getDefaultValues(
  item?: MapDetail["items"][number],
  initialCoordinates?: MapCoordinates,
): MapItemFormInput {
  return {
    title: item?.title ?? "",
    descriptionRich: item?.descriptionRich ?? emptyContentDoc,
    latitude: item ? Number(item.latitude) : initialCoordinates?.latitude,
    longitude: item ? Number(item.longitude) : initialCoordinates?.longitude,
  };
}

export function CmsMapItemFormScreen({
  mode,
  mapId,
  itemId,
  initialMap,
  initialCoordinates,
}: CmsMapItemFormScreenProps) {
  const router = useRouter();
  const trpcUtils = trpc.useUtils();
  const text = i18n.cms;
  const mapText = text.forms.resources.maps;
  const mapQuery = useMapById(mapId, { initialData: initialMap });
  const createMutation = useMapItemCreate();
  const updateMutation = useMapItemUpdate();
  const deleteMutation = useMapItemDelete();
  const map = mapQuery.data;
  const item =
    mode === "edit" ? map?.items.find((candidate) => candidate.id === itemId) : undefined;

  if (mapQuery.isPending) return <CmsMapItemFormLoading />;
  if (mapQuery.isError || !map) {
    const mapped = mapTrpcErrorToCmsUiMessage(mapQuery.error);
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }
  if (mode === "edit" && (!itemId || !item)) {
    return (
      <CmsErrorState
        title={mapText.invalidItemTitle}
        description={text.trpcErrors.notFoundDescription}
      />
    );
  }

  return (
    <MapItemFormContent
      key={item?.id ?? "new"}
      mode={mode}
      mapId={mapId}
      mapTitle={map.title}
      item={item}
      initialCoordinates={initialCoordinates}
      isMutating={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
      onCancel={() => router.push(cmsCrudRoutes.maps.edit(mapId))}
      onCreate={async (values) => {
        const created = await createMutation.mutateAsync({ mapId, ...values });
        await invalidateAfterCmsMutation(trpcUtils, "maps.createItem", { id: mapId });
        cmsToast.success(mapText.itemCreated);
        startTransition(() => {
          router.push(cmsCrudRoutes.maps.edit(created.mapId));
          router.refresh();
        });
      }}
      onUpdate={async (values) => {
        await updateMutation.mutateAsync({ mapId, itemId: item!.id, data: values });
        await invalidateAfterCmsMutation(trpcUtils, "maps.updateItem", { id: mapId });
        cmsToast.success(mapText.itemUpdated);
        startTransition(() => {
          router.push(cmsCrudRoutes.maps.edit(mapId));
          router.refresh();
        });
      }}
      onDelete={async () => {
        await deleteMutation.mutateAsync({ mapId, itemId: item!.id });
        await invalidateAfterCmsMutation(trpcUtils, "maps.deleteItem", { id: mapId });
        cmsToast.success(mapText.itemDeleted);
        startTransition(() => {
          router.push(cmsCrudRoutes.maps.edit(mapId));
          router.refresh();
        });
      }}
    />
  );
}

type MapItemFormContentProps = {
  mode: "create" | "edit";
  mapId: string;
  mapTitle: string;
  item?: MapDetail["items"][number];
  initialCoordinates?: MapCoordinates;
  isMutating: boolean;
  onCancel: () => void;
  onCreate: (values: MapItemFormValues) => Promise<void>;
  onUpdate: (values: MapItemFormValues) => Promise<void>;
  onDelete: () => Promise<void>;
};

function MapItemFormContent({
  mode,
  mapId,
  mapTitle,
  item,
  initialCoordinates,
  isMutating,
  onCancel,
  onCreate,
  onUpdate,
  onDelete,
}: MapItemFormContentProps) {
  const text = i18n.cms;
  const mapText = text.forms.resources.maps;
  const form = useForm<MapItemFormInput, unknown, MapItemFormValues>({
    resolver: zodResolver(mapItemFormSchema),
    defaultValues: getDefaultValues(item, initialCoordinates),
  });
  const descriptionRich = useWatch({ control: form.control, name: "descriptionRich" });
  const latitude = useWatch({ control: form.control, name: "latitude" });
  const longitude = useWatch({ control: form.control, name: "longitude" });
  const coordinates = {
    latitude:
      typeof latitude === "number" && Number.isFinite(latitude)
        ? latitude
        : defaultItemCoordinates.latitude,
    longitude:
      typeof longitude === "number" && Number.isFinite(longitude)
        ? longitude
        : defaultItemCoordinates.longitude,
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (mode === "create") {
        await onCreate(values);
        return;
      }

      await onUpdate(values);
    } catch (error) {
      const mapped = mapTrpcErrorToCmsUiMessage(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsPageHeader
        title={mode === "create" ? mapText.createItemTitle : mapText.editItemTitle}
        actions={
          <div className="flex items-center gap-2">
            {mode === "edit" ? (
              <CmsConfirmDialog
                triggerLabel={text.quickActions.delete}
                triggerIcon={<Trash2 aria-hidden />}
                triggerDisabled={isMutating}
                title={text.quickActions.confirmDeleteTitle}
                description={mapText.confirmDeleteItem}
                tone="danger"
                onConfirm={onDelete}
              />
            ) : null}
            <CmsActionButton variant="outline" onClick={onCancel} disabled={isMutating}>
              <X aria-hidden />
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={isMutating}>
              {mode === "create" ? <Plus aria-hidden /> : <Save aria-hidden />}
              {mode === "create" ? text.forms.create : text.forms.save}
            </CmsActionButton>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFormField
            label={text.forms.fields.title}
            htmlFor="map-item-title"
            error={form.formState.errors.title?.message}
            required
          >
            <CmsTextInput id="map-item-title" {...form.register("title")} />
          </CmsFormField>
          <CmsFormField label={text.forms.fields.description} htmlFor="map-item-description">
            <CmsRichTextEditor
              value={descriptionRich}
              onChange={(value) => form.setValue("descriptionRich", value, { shouldDirty: true })}
              ariaLabel={mapText.descriptionEditorAriaLabel}
            />
          </CmsFormField>
          <CmsMapPreview
            coordinates={coordinates}
            onCoordinatesChange={(nextCoordinates) => {
              form.setValue("latitude", nextCoordinates.latitude, {
                shouldDirty: true,
                shouldValidate: true,
              });
              form.setValue("longitude", nextCoordinates.longitude, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
          />
        </div>

        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {mapText.parentMapSection}
            </div>
            <Link
              href={cmsCrudRoutes.maps.edit(mapId)}
              className="block rounded-[6px] border border-foreground bg-card px-3 py-2.5 font-editorial text-[16px] leading-[1.2] text-foreground hover:text-accent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {mapTitle}
            </Link>
            <p className="font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {mapText.parentMapHint}
            </p>
          </section>

          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {mapText.coordinatesSection}
            </div>
            <CmsFormField
              label={text.forms.fields.latitude}
              htmlFor="map-item-latitude"
              error={form.formState.errors.latitude?.message}
              required
            >
              <CmsTextInput
                id="map-item-latitude"
                tone="mono"
                inputMode="decimal"
                {...form.register("latitude", { valueAsNumber: true })}
              />
            </CmsFormField>
            <CmsFormField
              label={text.forms.fields.longitude}
              htmlFor="map-item-longitude"
              error={form.formState.errors.longitude?.message}
              hint={mapText.coordinatesHint}
              required
            >
              <CmsTextInput
                id="map-item-longitude"
                tone="mono"
                inputMode="decimal"
                {...form.register("longitude", { valueAsNumber: true })}
              />
            </CmsFormField>
          </section>
        </div>
      </div>
    </form>
  );
}
