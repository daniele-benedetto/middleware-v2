"use client";

import { ArrowDown, ArrowUp, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { CmsErrorState } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsBody,
  CmsFormField,
  CmsMetaText,
  CmsPageHeader,
  CmsSearchSelect,
  CmsSelect,
  CmsTextInput,
  cmsToast,
} from "@/components/cms/primitives";
import { CmsSurface } from "@/components/cms/primitives/surface";
import { CmsNavigationBuilderLoading } from "@/features/cms/navigation/components/navigation-builder-loading";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { RouterOutputs } from "@/lib/trpc/types";

type NavigationMenus = RouterOutputs["navigation"]["listMenus"];
type NavigationMenu = NavigationMenus[number];
type NavigationItem = NavigationMenu["items"][number];
type NavigationMenuKey = NavigationMenu["key"];
type NavigationOptions = RouterOutputs["navigation"]["listOptions"];
type NavigationOption = NavigationOptions[number];

type CmsNavigationBuilderScreenProps = {
  initialData?: {
    menus: NavigationMenus;
    pageOptions: NavigationOptions;
    articleOptions: NavigationOptions;
    issueOptions: NavigationOptions;
    courseOptions: NavigationOptions;
  };
};

const menuOrder: NavigationMenuKey[] = ["main", "footer_sections", "footer_legal"];
const itemTypeOptions = [
  { value: "home", label: "Home" },
  { value: "archive", label: "Archivio uscite" },
  { value: "formazione", label: "Contro-formazione" },
  { value: "page", label: "Pagina statica" },
  { value: "article", label: "Articolo" },
  { value: "issue", label: "Uscita" },
  { value: "course", label: "Contro-formazione" },
  { value: "custom", label: "Link custom" },
] as const;

function createItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `nav_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getDefaultLabel(type: NavigationItem["type"]) {
  if (type === "home") return "Numero corrente";
  if (type === "archive") return "Archivio";
  if (type === "formazione") return "Contro-formazione";
  if (type === "page") return "Pagina";
  if (type === "article") return "Articolo";
  if (type === "issue") return "Uscita";
  if (type === "course") return "Contro-formazione";
  return "Nuovo link";
}

function createEmptyItem(type: NavigationItem["type"], options: ResourceOptions): NavigationItem {
  const base = { id: createItemId(), label: getDefaultLabel(type) };

  if (type === "page") return { ...base, type, resourceId: options.page[0]?.id ?? "" };
  if (type === "article") return { ...base, type, resourceId: options.article[0]?.id ?? "" };
  if (type === "issue") return { ...base, type, resourceId: options.issue[0]?.id ?? "" };
  if (type === "course") return { ...base, type, resourceId: options.course[0]?.id ?? "" };
  if (type === "custom") return { ...base, type, href: "/" };
  return { ...base, type };
}

function isSafeCustomHref(value: string) {
  if (value.startsWith("/") || value.startsWith("#")) return true;

  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function getOptionDescription(option: NavigationOption) {
  if (!option.meta) return option.href;
  const date = new Date(option.meta);
  const formatted = Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("it-IT");
  return formatted ? `${option.href} · ${formatted}` : option.href;
}

function toSearchOptions(options: NavigationOptions) {
  return options.map((option) => ({
    value: option.id,
    label: option.label,
    description: getOptionDescription(option),
    keywords: `${option.label} ${option.href}`,
  }));
}

type ResourceOptions = {
  page: NavigationOptions;
  article: NavigationOptions;
  issue: NavigationOptions;
  course: NavigationOptions;
};

function resolveItemHref(item: NavigationItem, options: ResourceOptions) {
  if (item.type === "home") return "/";
  if (item.type === "archive") return "/uscite";
  if (item.type === "formazione") return "/contro-formazione";
  if (item.type === "custom") return item.href;

  const source = options[item.type];
  return source.find((option) => option.id === item.resourceId)?.href ?? null;
}

function validateItems(items: NavigationItem[], options: ResourceOptions) {
  return items.flatMap((item, index) => {
    const errors: string[] = [];

    if (!item.label.trim()) errors.push(`Voce ${index + 1}: label obbligatoria.`);
    if (item.type === "custom" && !isSafeCustomHref(item.href)) {
      errors.push(`Voce ${index + 1}: URL custom non valido.`);
    }
    if (
      ["page", "article", "issue", "course"].includes(item.type) &&
      !resolveItemHref(item, options)
    ) {
      errors.push(`Voce ${index + 1}: seleziona una risorsa pubblicata.`);
    }

    return errors;
  });
}

function cloneMenus(menus: NavigationMenus) {
  return menus.map((menu) => ({ ...menu, items: menu.items.map((item) => ({ ...item })) }));
}

function sortMenus(menus: NavigationMenus) {
  return [...menus].sort((a, b) => menuOrder.indexOf(a.key) - menuOrder.indexOf(b.key));
}

export function CmsNavigationBuilderScreen({ initialData }: CmsNavigationBuilderScreenProps) {
  const text = i18n.cms;
  const trpcUtils = trpc.useUtils();
  const initialDraftMenus = sortMenus(cloneMenus(initialData?.menus ?? []));
  const menusQuery = trpc.navigation.listMenus.useQuery(undefined, {
    staleTime: 30_000,
    initialData: initialData?.menus,
  });
  const pageOptionsQuery = trpc.navigation.listOptions.useQuery(
    { type: "page" },
    { staleTime: 30_000, initialData: initialData?.pageOptions },
  );
  const articleOptionsQuery = trpc.navigation.listOptions.useQuery(
    { type: "article" },
    { staleTime: 30_000, initialData: initialData?.articleOptions },
  );
  const issueOptionsQuery = trpc.navigation.listOptions.useQuery(
    { type: "issue" },
    { staleTime: 30_000, initialData: initialData?.issueOptions },
  );
  const courseOptionsQuery = trpc.navigation.listOptions.useQuery(
    { type: "course" },
    { staleTime: 30_000, initialData: initialData?.courseOptions },
  );
  const updateMutation = trpc.navigation.update.useMutation();
  const [activeKey, setActiveKey] = useState<NavigationMenuKey>("main");
  const [draftMenus, setDraftMenus] = useState<NavigationMenus>(() => initialDraftMenus);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialDraftMenus));
  const [newItemType, setNewItemType] = useState<NavigationItem["type"]>("page");

  const resourceOptions: ResourceOptions = useMemo(
    () => ({
      page: pageOptionsQuery.data ?? [],
      article: articleOptionsQuery.data ?? [],
      issue: issueOptionsQuery.data ?? [],
      course: courseOptionsQuery.data ?? [],
    }),
    [
      articleOptionsQuery.data,
      courseOptionsQuery.data,
      issueOptionsQuery.data,
      pageOptionsQuery.data,
    ],
  );

  const activeMenu = draftMenus.find((menu) => menu.key === activeKey) ?? draftMenus[0];
  const isDirty = JSON.stringify(draftMenus) !== savedSnapshot;
  const validationErrors = activeMenu ? validateItems(activeMenu.items, resourceOptions) : [];
  const canSave = Boolean(activeMenu) && validationErrors.length === 0 && isDirty;

  if (menusQuery.isPending) return <CmsNavigationBuilderLoading />;

  if (menusQuery.isError) {
    const uiError = mapTrpcErrorToCmsUiMessage(menusQuery.error);
    return (
      <CmsErrorState
        title={uiError.title}
        description={uiError.description}
        onRetry={menusQuery.refetch}
      />
    );
  }

  if (!activeMenu) {
    return (
      <CmsErrorState title="Navigazione non disponibile" description="Nessun menu configurato." />
    );
  }

  const updateActiveItems = (items: NavigationItem[]) => {
    setDraftMenus((current) =>
      current.map((menu) => (menu.key === activeMenu.key ? { ...menu, items } : menu)),
    );
  };

  const updateItem = (itemId: string, patch: Partial<NavigationItem>) => {
    updateActiveItems(
      activeMenu.items.map((item) =>
        item.id === itemId ? ({ ...item, ...patch } as NavigationItem) : item,
      ),
    );
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= activeMenu.items.length) return;
    const nextItems = [...activeMenu.items];
    const [item] = nextItems.splice(index, 1);
    if (!item) return;
    nextItems.splice(nextIndex, 0, item);
    updateActiveItems(nextItems);
  };

  const addItem = () => {
    updateActiveItems([...activeMenu.items, createEmptyItem(newItemType, resourceOptions)]);
  };

  const removeItem = (itemId: string) => {
    updateActiveItems(activeMenu.items.filter((item) => item.id !== itemId));
  };

  const saveActiveMenu = async () => {
    try {
      const updated = await updateMutation.mutateAsync({
        key: activeMenu.key,
        items: activeMenu.items,
      });
      await invalidateAfterCmsMutation(trpcUtils, "navigation.update", { key: activeMenu.key });
      setDraftMenus((current) =>
        sortMenus(current.map((menu) => (menu.key === updated.key ? updated : menu))),
      );
      setSavedSnapshot(
        JSON.stringify(
          sortMenus(draftMenus.map((menu) => (menu.key === updated.key ? updated : menu))),
        ),
      );
      cmsToast.success(text.common.actionCompleted);
    } catch (error) {
      const uiError = mapTrpcErrorToCmsUiMessage(error);
      cmsToast.error(uiError.description, uiError.title);
    }
  };

  const resetDraft = () => {
    setDraftMenus(sortMenus(cloneMenus(menusQuery.data ?? [])));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsPageHeader
        title={text.navigation.publicNavigation}
        actions={
          <>
            <CmsActionButton
              variant="outline"
              disabled={!isDirty || updateMutation.isPending}
              onClick={resetDraft}
            >
              Ripristina
            </CmsActionButton>
            <CmsActionButton
              disabled={!canSave}
              isLoading={updateMutation.isPending}
              onClick={saveActiveMenu}
            >
              <Save aria-hidden />
              Salva
            </CmsActionButton>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="cms-scroll min-h-0 min-w-0 space-y-4 overflow-y-auto pb-6 lg:pr-6">
          <CmsSurface className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <CmsFormField label="Menu" htmlFor="navigation-menu-key" className="min-w-64 flex-1">
                <CmsSelect
                  value={activeMenu.key}
                  onValueChange={(value) => setActiveKey(value as NavigationMenuKey)}
                  options={draftMenus.map((menu) => ({ value: menu.key, label: menu.label }))}
                />
              </CmsFormField>
              <div className="flex items-end gap-2">
                <CmsFormField label="Tipo voce" htmlFor="navigation-new-type">
                  <CmsSelect
                    value={newItemType}
                    onValueChange={(value) => setNewItemType(value as NavigationItem["type"])}
                    options={[...itemTypeOptions]}
                  />
                </CmsFormField>
                <CmsActionButton variant="outline" onClick={addItem}>
                  <Plus aria-hidden />
                  Aggiungi
                </CmsActionButton>
              </div>
            </div>
            <CmsBody size="sm" tone="muted">
              Scegli risorse pubblicate o link custom. Le label sono sempre personalizzabili.
            </CmsBody>
          </CmsSurface>

          {activeMenu.items.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-border bg-card-hover px-4 py-6">
              <CmsBody size="sm" tone="muted">
                Nessuna voce nel menu selezionato.
              </CmsBody>
            </div>
          ) : null}

          {activeMenu.items.map((item, index) => (
            <NavigationItemCard
              key={item.id}
              item={item}
              index={index}
              total={activeMenu.items.length}
              options={resourceOptions}
              onMove={moveItem}
              onRemove={removeItem}
              onUpdate={updateItem}
            />
          ))}
        </div>

        <aside className="cms-scroll min-h-0 min-w-0 space-y-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <PreviewPanel menu={activeMenu} options={resourceOptions} />
          <DiagnosticsPanel errors={validationErrors} isDirty={isDirty} />
        </aside>
      </div>
    </div>
  );
}

function NavigationItemCard({
  item,
  index,
  total,
  options,
  onMove,
  onRemove,
  onUpdate,
}: {
  item: NavigationItem;
  index: number;
  total: number;
  options: ResourceOptions;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (itemId: string) => void;
  onUpdate: (itemId: string, patch: Partial<NavigationItem>) => void;
}) {
  const href = resolveItemHref(item, options);
  const typeLabel =
    itemTypeOptions.find((option) => option.value === item.type)?.label ?? item.type;

  return (
    <CmsSurface className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CmsMetaText variant="category">
            {String(index + 1).padStart(2, "0")} / {typeLabel}
          </CmsMetaText>
          <p className="mt-1 font-ui text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
            {href ?? "Risorsa pubblicata richiesta"}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton label="Sposta su" disabled={index === 0} onClick={() => onMove(index, -1)}>
            <ArrowUp className="size-3.5" />
          </IconButton>
          <IconButton
            label="Sposta giù"
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
          >
            <ArrowDown className="size-3.5" />
          </IconButton>
          <IconButton label="Elimina" onClick={() => onRemove(item.id)}>
            <Trash2 className="size-3.5" />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CmsFormField label="Label" htmlFor={`nav-label-${item.id}`}>
          <CmsTextInput
            id={`nav-label-${item.id}`}
            value={item.label}
            onChange={(event) => onUpdate(item.id, { label: event.target.value })}
            tone="ui"
            state={item.label.trim() ? undefined : "error"}
          />
        </CmsFormField>

        {item.type === "custom" ? (
          <CmsFormField label="URL" htmlFor={`nav-href-${item.id}`}>
            <CmsTextInput
              id={`nav-href-${item.id}`}
              value={item.href}
              onChange={(event) =>
                onUpdate(item.id, { href: event.target.value } as Partial<NavigationItem>)
              }
              tone="mono"
              state={isSafeCustomHref(item.href) ? undefined : "error"}
            />
          </CmsFormField>
        ) : null}

        {item.type === "page" ||
        item.type === "article" ||
        item.type === "issue" ||
        item.type === "course" ? (
          <CmsFormField label="Risorsa pubblicata" htmlFor={`nav-resource-${item.id}`}>
            <CmsSearchSelect
              value={item.resourceId}
              onValueChange={(value) =>
                onUpdate(item.id, { resourceId: value } as Partial<NavigationItem>)
              }
              options={toSearchOptions(options[item.type])}
              state={href ? undefined : "error"}
            />
          </CmsFormField>
        ) : null}
      </div>
    </CmsSurface>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-[6px] border border-foreground bg-card transition-colors hover:bg-card-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent",
        disabled && "cursor-not-allowed border-border text-border hover:bg-card",
      )}
    >
      {children}
    </button>
  );
}

function PreviewPanel({ menu, options }: { menu: NavigationMenu; options: ResourceOptions }) {
  return (
    <CmsSurface className="space-y-4">
      <div>
        <CmsMetaText variant="category">Preview</CmsMetaText>
        <h2 className="mt-1 font-heading text-[22px] leading-none font-black tracking-[-0.03em]">
          {menu.label}
        </h2>
      </div>
      <div className="space-y-2">
        {menu.items.map((item, index) => {
          const href = resolveItemHref(item, options);
          return (
            <div key={item.id} className="flex items-baseline gap-3 border-b border-border pb-2">
              <span className="font-heading text-[11px] font-black text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-ui text-[13px] font-extrabold tracking-[0.08em] uppercase">
                  {item.label || "Senza label"}
                </p>
                <p className="truncate font-technical text-[12px] text-muted-foreground">
                  {href ?? "Non pubblicato"}
                </p>
              </div>
              {href?.startsWith("http") ? (
                <ExternalLink className="size-3 text-muted-foreground" />
              ) : null}
            </div>
          );
        })}
      </div>
    </CmsSurface>
  );
}

function DiagnosticsPanel({ errors, isDirty }: { errors: string[]; isDirty: boolean }) {
  return (
    <CmsSurface className="space-y-3">
      <CmsMetaText variant="category">Diagnostica</CmsMetaText>
      <div className="space-y-2">
        <p className="font-editorial text-[15px] leading-normal text-body-text">
          {isDirty ? "Ci sono modifiche non salvate." : "Menu allineato al salvataggio."}
        </p>
        {errors.length > 0 ? (
          <ul className="space-y-1 font-ui text-[11px] font-bold tracking-[0.06em] text-accent uppercase">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : (
          <p className="font-ui text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
            Nessun problema rilevato.
          </p>
        )}
      </div>
    </CmsSurface>
  );
}
