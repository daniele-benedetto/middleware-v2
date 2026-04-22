"use client";

import { PauseIcon, PlayIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EditorialAudioPlayerProps = {
  label?: string;
  currentSeconds: number;
  totalSeconds: number;
  isPlaying?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  className?: string;
};

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function EditorialAudioPlayer({
  label = "ASCOLTA L'ARTICOLO",
  currentSeconds,
  totalSeconds,
  isPlaying = false,
  onToggle,
  onClose,
  className,
}: EditorialAudioPlayerProps) {
  const progress = totalSeconds > 0 ? Math.min(100, (currentSeconds / totalSeconds) * 100) : 0;

  return (
    <div
      className={cn(
        "max-w-[480px] border-2 border-foreground bg-white px-[18px] py-[14px]",
        className,
      )}
    >
      <div className="mb-[10px] flex items-center justify-between gap-[12px]">
        <span className="font-ui text-[11px] uppercase tracking-[0.06em] text-foreground">
          {label}
        </span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="font-ui text-[12px] text-[color:var(--ink-60)] hover:text-foreground"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-[14px]">
        <button
          type="button"
          onClick={onToggle}
          aria-label={isPlaying ? "Pausa" : "Riproduci"}
          className="flex size-[36px] shrink-0 items-center justify-center bg-foreground text-white hover:brightness-[0.88]"
        >
          {isPlaying ? <PauseIcon className="size-[14px]" /> : <PlayIcon className="size-[14px]" />}
        </button>

        <div className="relative h-[3px] flex-1 bg-[rgba(10,10,10,0.2)]">
          <div
            className="h-full bg-accent transition-[width] duration-[var(--motion-base)] ease-[cubic-bezier(0.2,0,0,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="shrink-0 font-ui text-[11px] text-[color:var(--ink-60)]">
          {formatTime(currentSeconds)} / {formatTime(totalSeconds)}
        </span>
      </div>
    </div>
  );
}
