"use client";

import Image from "next/image";
import { useRef } from "react";

import { CmsSelect, CmsTextInput } from "@/components/cms/primitives";
import { cn } from "@/lib/utils";

type ImageFilter = "GRAYSCALE" | "COLOR";

type ImagePresentationFieldProps = {
  url: string;
  focalX: number;
  focalY: number;
  imageFilter: ImageFilter;
  zoom: number;
  disabled?: boolean;
  onFocalPointChange: (point: { x: number; y: number }) => void;
  onFilterChange: (value: ImageFilter) => void;
  onZoomChange: (value: number) => void;
};

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function ImagePresentationField({
  url,
  focalX,
  focalY,
  imageFilter,
  zoom,
  disabled = false,
  onFocalPointChange,
  onFilterChange,
  onZoomChange,
}: ImagePresentationFieldProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  const updateFocalPoint = (clientX: number, clientY: number) => {
    const bounds = previewRef.current?.getBoundingClientRect();

    if (!bounds || disabled) {
      return;
    }

    onFocalPointChange({
      x: clamp(((clientX - bounds.left) / bounds.width) * 100),
      y: clamp(((clientY - bounds.top) / bounds.height) * 100),
    });
  };

  if (!url) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div
        ref={previewRef}
        className="relative aspect-video cursor-crosshair overflow-hidden border border-foreground bg-foreground touch-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFocalPoint(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            updateFocalPoint(event.clientX, event.clientY);
          }
        }}
      >
        <Image
          fill
          unoptimized
          src={url}
          alt=""
          sizes="(max-width: 1024px) 100vw, 40vw"
          className={cn("object-cover", imageFilter === "GRAYSCALE" && "grayscale")}
          style={{
            objectPosition: `${focalX}% ${focalY}%`,
            transform: `scale(${zoom})`,
            transformOrigin: `${focalX}% ${focalY}%`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-4 border border-background/80"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground/50"
          style={{ left: `${focalX}%`, top: `${focalY}%` }}
          aria-hidden
        />
      </div>
      <div>
        <label className="space-y-1.5 font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Filtro immagine
          <CmsSelect
            value={imageFilter}
            disabled={disabled}
            onValueChange={(value) => onFilterChange(value as ImageFilter)}
            options={[
              { value: "GRAYSCALE", label: "Bianco e nero" },
              { value: "COLOR", label: "Colore" },
            ]}
          />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="space-y-1.5 font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          X (%)
          <CmsTextInput
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={focalX}
            disabled={disabled}
            onChange={(event) =>
              onFocalPointChange({ x: clamp(Number(event.target.value)), y: focalY })
            }
            tone="mono"
          />
        </label>
        <label className="space-y-1.5 font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Y (%)
          <CmsTextInput
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={focalY}
            disabled={disabled}
            onChange={(event) =>
              onFocalPointChange({ x: focalX, y: clamp(Number(event.target.value)) })
            }
            tone="mono"
          />
        </label>
        <label className="space-y-1.5 font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          Zoom
          <CmsTextInput
            type="number"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            disabled={disabled}
            onChange={(event) => onZoomChange(Math.min(3, Math.max(1, Number(event.target.value))))}
            tone="mono"
          />
        </label>
      </div>
    </div>
  );
}
