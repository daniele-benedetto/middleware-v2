"use client";

import { PauseIcon, PlayIcon } from "lucide-react";

import { i18n } from "@/lib/i18n";
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
  label,
  currentSeconds,
  totalSeconds,
  isPlaying = false,
  onToggle,
  onClose,
  className,
}: EditorialAudioPlayerProps) {
  const text = i18n.editorial.audioPlayer;
  const resolvedLabel = label ?? text.defaultLabel;
  const progress = totalSeconds > 0 ? Math.min(100, (currentSeconds / totalSeconds) * 100) : 0;

  return (
    <div className={cn("max-w-120 border border-foreground bg-white px-4.5 py-3.5", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <span className="font-ui text-[11px] uppercase tracking-[0.06em] text-foreground">
          {resolvedLabel}
        </span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={text.closeAriaLabel}
            className="font-ui text-[12px] text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onToggle}
          aria-label={isPlaying ? text.pauseAriaLabel : text.playAriaLabel}
          className="flex size-9 shrink-0 items-center justify-center bg-foreground text-white hover:brightness-[0.88]"
        >
          {isPlaying ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
        </button>

        <div className="relative h-0.75 flex-1 bg-[rgba(10,10,10,0.2)]">
          <div
            className="h-full bg-accent transition-[width] duration-(--motion-base) ease-[cubic-bezier(0.2,0,0,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="shrink-0 font-ui text-[11px] text-muted-foreground">
          {formatTime(currentSeconds)} / {formatTime(totalSeconds)}
        </span>
      </div>
    </div>
  );
}
