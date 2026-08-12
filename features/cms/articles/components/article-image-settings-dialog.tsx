"use client";

import { Settings2 } from "lucide-react";
import Image from "next/image";

import { CmsActionButton, CmsMetaText } from "@/components/cms/primitives";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  defaultArticleImageSettings,
  type ArticleImageSettings,
} from "@/lib/articles/image-settings";
import { cn } from "@/lib/utils";

type ArticleImageSettingsDialogProps = {
  imageUrl: string;
  value: ArticleImageSettings;
  disabled?: boolean;
  onChange: (value: ArticleImageSettings) => void;
};

const focusPoints = [
  [0, 0],
  [50, 0],
  [100, 0],
  [0, 50],
  [50, 50],
  [100, 50],
  [0, 100],
  [50, 100],
  [100, 100],
] as const;

export function ArticleImageSettingsDialog({
  imageUrl,
  value,
  disabled,
  onChange,
}: ArticleImageSettingsDialogProps) {
  const update = (next: Partial<ArticleImageSettings>) => onChange({ ...value, ...next });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <CmsActionButton variant="outline" size="xs" disabled={disabled}>
            <Settings2 aria-hidden />
            Visualizzazione
          </CmsActionButton>
        }
      />
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto p-5"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Visualizzazione copertina</DialogTitle>
          <DialogDescription>
            Le impostazioni vengono applicate in tutte le card e nella pagina dell&apos;articolo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="relative aspect-video overflow-hidden border border-foreground bg-card-hover">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              unoptimized
              className={cn(value.grayscale && "grayscale")}
              style={{
                objectFit: value.fit,
                objectPosition: `${value.positionX}% ${value.positionY}%`,
                transform: `scale(${value.zoom / 100})`,
              }}
            />
          </div>

          <div className="space-y-5">
            <label className="flex items-center justify-between gap-4 border-b border-foreground pb-4">
              <span>
                <CmsMetaText variant="category">Bianco e nero</CmsMetaText>
                <span className="mt-1 block font-editorial text-sm text-body-text">
                  Filtro monocromatico
                </span>
              </span>
              <Switch
                checked={value.grayscale}
                onCheckedChange={(grayscale) => update({ grayscale })}
              />
            </label>

            <fieldset className="space-y-2">
              <legend className="font-ui text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                Adattamento
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(["cover", "contain"] as const).map((fit) => (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => update({ fit })}
                    className={cn(
                      "border px-3 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.08em]",
                      value.fit === fit
                        ? "border-accent bg-accent text-background"
                        : "border-foreground",
                    )}
                  >
                    {fit === "cover" ? "Riempi" : "Contieni"}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="font-ui text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                Punto focale
              </legend>
              <div className="grid grid-cols-3 overflow-hidden border border-foreground">
                {focusPoints.map(([positionX, positionY]) => (
                  <button
                    key={`${positionX}-${positionY}`}
                    type="button"
                    aria-label={`Punto focale ${positionX}%, ${positionY}%`}
                    onClick={() => update({ positionX, positionY })}
                    className={cn(
                      "aspect-square border-r border-b border-foreground last:border-r-0",
                      value.positionX === positionX && value.positionY === positionY
                        ? "bg-accent"
                        : "bg-card hover:bg-surface-hover",
                    )}
                  />
                ))}
              </div>
            </fieldset>

            <label className="block space-y-2">
              <span className="flex justify-between font-ui text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
                Ingrandimento <span>{value.zoom}%</span>
              </span>
              <input
                type="range"
                min="100"
                max="150"
                value={value.zoom}
                onChange={(event) => update({ zoom: Number(event.target.value) })}
                className="w-full accent-accent"
              />
            </label>
            <CmsActionButton
              variant="ghost"
              size="xs"
              onClick={() => onChange(defaultArticleImageSettings)}
            >
              Ripristina predefiniti
            </CmsActionButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
