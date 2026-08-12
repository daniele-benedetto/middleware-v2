"use client";

import { Plus, Save, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
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
import { CmsMapWorkspaceCanvas } from "@/features/cms/maps/components/map-workspace-canvas";
import {
  useMapById,
  useMapUpdate,
  type MapDetail,
  type UpdateMapInput,
} from "@/features/cms/maps/hooks/use-map-crud";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { updateMapInputSchema } from "@/lib/server/modules/maps/schema";
import { trpc } from "@/lib/trpc/react";

type CmsMapWorkspaceScreenProps = {
  mapId: string;
  initialData?: MapDetail;
};

export function CmsMapWorkspaceScreen({ mapId, initialData }: CmsMapWorkspaceScreenProps) {
  const router = useRouter();
  const trpcUtils = trpc.useUtils();
  const text = i18n.cms;
  const mapText = text.forms.resources.maps;
  const mapQuery = useMapById(mapId, { initialData });
  const updateMutation = useMapUpdate();
  const map = mapQuery.data;
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const itemRowRefs = useRef(new Map<string, HTMLButtonElement>());
  const [titleStyled, setTitleStyled] = useState(() =>
    createStyledTitleValue(initialData?.title ?? "", initialData?.titleStyled),
  );
  const [descriptionRich, setDescriptionRich] = useState<unknown>(
    initialData?.descriptionRich ?? { type: "doc", content: [{ type: "paragraph" }] },
  );

  const selectItem = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    requestAnimationFrame(() => itemRowRefs.current.get(itemId)?.focus());
  }, []);

  if (mapQuery.isPending) return <CmsLoadingState />;
  if (mapQuery.isError || !map) {
    const mapped = mapTrpcErrorToCmsUiMessage(mapQuery.error);
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  const saveMetadata = async () => {
    const data: UpdateMapInput = {
      title: getStyledTitlePlainText(titleStyled),
      titleStyled: hasStyledTitleFormatting(titleStyled) ? titleStyled : null,
      descriptionRich,
    };
    const validation = updateMapInputSchema.safeParse(data);
    if (!validation.success) {
      cmsToast.error(text.trpcErrors.badRequestDescription, text.trpcErrors.badRequestTitle);
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: mapId, data: validation.data });
      await invalidateAfterCmsMutation(trpcUtils, "maps.update", { id: mapId });
      cmsToast.success(mapText.updated);
    } catch (error) {
      const mapped = mapTrpcErrorToCmsUiMessage(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsPageHeader
        title={mapText.editTitle}
        actions={
          <div className="flex items-center gap-2">
            <CmsActionButton variant="outline" onClick={() => router.push("/cms/maps")}>
              <X aria-hidden />
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton
              onClick={() => void saveMetadata()}
              isLoading={updateMutation.isPending}
            >
              <Save aria-hidden />
              {text.forms.save}
            </CmsActionButton>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-0">
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFormField label={text.forms.fields.title} htmlFor="map-workspace-title" required>
            <CmsStyledTitleEditor
              id="map-workspace-title"
              value={titleStyled}
              onChange={setTitleStyled}
              placeholder={text.forms.fields.title}
              accentLabel={mapText.titleStyledAccentAction}
              lineBreakLabel={mapText.titleStyledLineBreakAction}
              ariaLabel={mapText.titleStyledEditorAriaLabel}
            />
          </CmsFormField>

          <CmsFormField label={text.forms.fields.description} htmlFor="map-workspace-description">
            <CmsRichTextEditor
              value={descriptionRich}
              onChange={setDescriptionRich}
              ariaLabel={mapText.descriptionEditorAriaLabel}
            />
          </CmsFormField>

          <CmsMapWorkspaceCanvas
            items={map.items}
            selectedItemId={selectedItemId}
            onSelectItem={selectItem}
            selectedItemHref={(itemId) => cmsCrudRoutes.maps.items.edit(mapId, itemId)}
            attribution={mapText.workspaceAttribution}
            unavailableText={mapText.workspaceMapUnavailable}
          />
        </div>

        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="min-h-0 space-y-3" aria-label={mapText.itemsSection}>
            <div className="flex items-center justify-between gap-3">
              <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                {mapText.itemsSection}
              </div>
              <CmsActionButton
                variant="outline"
                size="xs"
                onClick={() => router.push(cmsCrudRoutes.maps.items.create(mapId))}
              >
                <Plus aria-hidden />
                {mapText.newItem}
              </CmsActionButton>
            </div>
            {map.items.length === 0 ? (
              <p className="rounded-[6px] border border-dashed border-border px-3 py-4 font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {mapText.itemsEmpty}
              </p>
            ) : (
              <div className="space-y-2">
                {map.items.map((item) => {
                  const selected = item.id === selectedItemId;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-[6px] border p-3 ${selected ? "border-accent bg-accent/10" : "border-border bg-card"}`}
                    >
                      <button
                        ref={(element) => {
                          if (element) itemRowRefs.current.set(item.id, element);
                          else itemRowRefs.current.delete(item.id);
                        }}
                        type="button"
                        className="w-full text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        onClick={() => selectItem(item.id)}
                        aria-pressed={selected}
                      >
                        <span className="block font-editorial text-[16px] leading-[1.2] text-foreground">
                          {item.title}
                        </span>
                        <span className="mt-1 block font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          {mapText.itemOrder(item.sortOrder + 1)}
                        </span>
                        {extractPlainText(item.descriptionRich) ? (
                          <span className="mt-2 block line-clamp-2 font-editorial text-[14px] leading-[1.35] text-muted-foreground">
                            {extractPlainText(item.descriptionRich)}
                          </span>
                        ) : null}
                      </button>
                      <Link
                        href={cmsCrudRoutes.maps.items.edit(mapId, item.id)}
                        className="mt-3 inline-flex font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-accent underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {text.quickActions.edit}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
