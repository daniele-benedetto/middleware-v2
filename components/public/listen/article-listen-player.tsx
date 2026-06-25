"use client";

import { PauseIcon, PlayIcon, RotateCcwIcon, RotateCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  formatAudioTime,
  getActiveAudioChunk,
  getVisibleAudioChunks,
  type AudioChunk,
  type VisibleAudioChunk,
} from "@/lib/audio/audio-chunks";
import {
  deleteAudioProgress,
  getAudioProgress,
  saveAudioProgress,
  type AudioProgressRecord,
  type AudioProgressStatus,
} from "@/lib/browser/storage/audio-progress-store";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type ArticleListenPlayerProps = {
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  articleUpdatedAt: string;
  audioUrl: string;
  chunks: AudioChunk[];
  header: ReactNode;
  emptyState: ReactNode;
};

type ChunkWindowProps = {
  chunks: VisibleAudioChunk[];
  onChunkSelect: (chunk: AudioChunk) => void;
};

const minimumResumeTime = 10;
const saveIntervalSeconds = 15;
const completionThresholdSeconds = 3;

function clampTime(value: number, duration: number) {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(duration) || duration <= 0) return Math.max(0, value);
  return Math.min(duration, Math.max(0, value));
}

function getFiniteDuration(audio: HTMLAudioElement) {
  return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
}

function isResumeCandidate(record: AudioProgressRecord) {
  if (record.status === "completed") return false;
  if (record.currentTime < minimumResumeTime) return false;
  if (record.duration && record.duration - record.currentTime <= completionThresholdSeconds)
    return false;
  return true;
}

function ChunkWindow({ chunks, onChunkSelect }: ChunkWindowProps) {
  const text = i18n.public.listenPage;

  if (chunks.length === 0) {
    return null;
  }

  return (
    <div
      className="grid gap-4 border-t-2 border-foreground pt-6 sm:gap-5 sm:pt-8"
      role="group"
      aria-label={text.syncedText}
    >
      <p className="font-heading text-[11px] font-extrabold tracking-[0.14em] text-accent uppercase">
        {text.syncedText}
      </p>
      {chunks.map((chunk) => {
        const isActive = chunk.position === "active";

        return (
          <button
            key={chunk.id}
            type="button"
            onClick={() => onChunkSelect(chunk)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "group w-full cursor-pointer text-left font-editorial transition-[opacity,transform,color] duration-(--motion-slow) focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-accent",
              isActive
                ? "translate-x-0 text-foreground opacity-100"
                : "translate-x-0 text-muted opacity-55 hover:text-body-text hover:opacity-85 sm:translate-x-2",
            )}
          >
            <span
              className={cn(
                "block leading-[1.18]",
                isActive
                  ? "border-l-4 border-accent pl-4 text-[clamp(28px,4.5vw,56px)] font-semibold tracking-[-0.035em]"
                  : "pl-5 text-[clamp(18px,2vw,26px)] italic",
              )}
            >
              {chunk.text}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ArticleListenPlayer({
  articleId,
  articleSlug,
  articleTitle,
  articleUpdatedAt,
  audioUrl,
  chunks,
  header,
  emptyState,
}: ArticleListenPlayerProps) {
  const text = i18n.public.listenPage;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const hasInteractedRef = useRef(false);
  const startedAtRef = useRef<string | null>(null);
  const lastSavedBucketRef = useRef(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [savedProgress, setSavedProgress] = useState<AudioProgressRecord | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState(false);
  const activeChunk =
    getActiveAudioChunk(chunks, currentTime) ??
    chunks.findLast((chunk) => currentTime >= chunk.end) ??
    chunks[0] ??
    null;
  const activeChunkId = activeChunk?.id ?? null;
  const visibleChunks = useMemo(
    () => getVisibleAudioChunks(chunks, activeChunkId),
    [chunks, activeChunkId],
  );
  const resolvedDuration = duration > 0 ? duration : (chunks.at(-1)?.end ?? 0);
  const progress = resolvedDuration > 0 ? (currentTime / resolvedDuration) * 100 : 0;
  const shouldOfferResume = savedProgress ? isResumeCandidate(savedProgress) : false;

  const persistProgress = useCallback(
    async (status: AudioProgressStatus = "listening", timeOverride?: number) => {
      const nextTime = Math.max(0, timeOverride ?? currentTimeRef.current);
      const resolvedRecordDuration = durationRef.current > 0 ? durationRef.current : null;
      const now = new Date().toISOString();
      const isCompleted = status === "completed";
      const record: AudioProgressRecord = {
        articleId,
        articleSlug,
        articleTitle,
        articleUpdatedAt,
        audioUrl,
        currentTime: isCompleted ? 0 : nextTime,
        duration: resolvedRecordDuration,
        status,
        startedAt: startedAtRef.current ?? now,
        updatedAt: now,
        completedAt: isCompleted ? now : null,
      };

      startedAtRef.current = record.startedAt;
      await saveAudioProgress(record);
      setSavedProgress(isResumeCandidate(record) ? record : null);
    },
    [articleId, articleSlug, articleTitle, articleUpdatedAt, audioUrl],
  );

  useEffect(() => {
    currentTimeRef.current = currentTime;
    durationRef.current = resolvedDuration;
    hasInteractedRef.current = hasInteracted;
  }, [currentTime, hasInteracted, resolvedDuration]);

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      const record = await getAudioProgress(articleId);
      if (cancelled) return;

      if (
        !record ||
        record.audioUrl !== audioUrl ||
        record.articleUpdatedAt !== articleUpdatedAt ||
        !isResumeCandidate(record)
      ) {
        setSavedProgress(null);
        startedAtRef.current = null;
        return;
      }

      setSavedProgress(record);
      startedAtRef.current = record.startedAt;
      lastSavedBucketRef.current = Math.floor(record.currentTime / saveIntervalSeconds);
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = record.currentTime;
      }
      setCurrentTime(record.currentTime);
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [articleId, articleUpdatedAt, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (!hasInteracted || currentTime < minimumResumeTime) return;

    const bucket = Math.floor(currentTime / saveIntervalSeconds);
    if (bucket <= lastSavedBucketRef.current) return;

    lastSavedBucketRef.current = bucket;
    void persistProgress("listening");
  }, [currentTime, hasInteracted, persistProgress]);

  useEffect(() => {
    const handlePageHide = () => {
      if (!hasInteractedRef.current || currentTimeRef.current < minimumResumeTime) return;
      void persistProgress("paused");
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handlePageHide);
    };
  }, [persistProgress]);

  const syncDuration = (audio: HTMLAudioElement) => {
    const nextDuration = getFiniteDuration(audio);
    if (nextDuration > 0) setDuration(nextDuration);
  };

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const nextTime = clampTime(seconds, getFiniteDuration(audio) || resolvedDuration);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
    return nextTime;
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    setHasInteracted(true);
    setAudioError(false);

    if (audio.paused) {
      void persistProgress("listening");
      audio.play().catch(() => {
        setIsPlaying(false);
        setAudioError(true);
      });
      return;
    }

    audio.pause();
    void persistProgress("paused");
  };

  const commitSeek = (target: number) => {
    const nextTime = seekTo(target);
    if (nextTime === undefined) return;

    setHasInteracted(true);
    void persistProgress(isPlaying ? "listening" : "paused", nextTime);
  };

  const seekBy = (seconds: number) => commitSeek(currentTime + seconds);

  const handleSeekTo = (seconds: number) => commitSeek(seconds);

  const restart = () => {
    setHasInteracted(true);
    seekTo(0);
    void deleteAudioProgress(articleId);
    setSavedProgress(null);
    startedAtRef.current = null;
    lastSavedBucketRef.current = -1;
  };

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8 sm:gap-10">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(event) => syncDuration(event.currentTarget)}
        onDurationChange={(event) => syncDuration(event.currentTarget)}
        onCanPlay={(event) => syncDuration(event.currentTarget)}
        onTimeUpdate={(event) => {
          syncDuration(event.currentTarget);
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onPlay={(event) => {
          syncDuration(event.currentTarget);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onError={() => setAudioError(true)}
        onEnded={(event) => {
          event.currentTarget.currentTime = 0;
          setCurrentTime(0);
          setIsPlaying(false);
          void persistProgress("completed", 0);
        }}
      />

      <div className="grid gap-6 border-2 border-foreground bg-background p-4 sm:gap-7 sm:p-6 lg:p-8">
        {header}

        <div className="grid gap-5">
          <p role="status" className="sr-only">
            {isPlaying ? text.playingStatus : text.pausedStatus}
          </p>
          {shouldOfferResume && savedProgress ? (
            <div
              role="status"
              className="border-l-4 border-accent bg-accent/10 px-4 py-3 font-heading text-[12px] font-bold tracking-[0.08em] uppercase"
            >
              {text.resumeFrom(formatAudioTime(savedProgress.currentTime))}
            </div>
          ) : null}

          <div className="grid gap-3">
            <input
              type="range"
              min={0}
              max={resolvedDuration || 0}
              step="0.01"
              value={clampTime(currentTime, resolvedDuration)}
              disabled={resolvedDuration <= 0}
              onInput={(event) => handleSeekTo(Number(event.currentTarget.value))}
              onChange={(event) => handleSeekTo(Number(event.currentTarget.value))}
              className="h-2 w-full cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={text.progressAriaLabel}
              aria-valuetext={text.progressValueText(
                formatAudioTime(currentTime),
                formatAudioTime(resolvedDuration),
              )}
            />
            <div className="flex items-center justify-between font-heading text-[12px] font-bold tracking-[0.08em] text-muted uppercase">
              <span>{formatAudioTime(currentTime)}</span>
              <span>{formatAudioTime(resolvedDuration)}</span>
            </div>
            <div className="h-1 bg-foreground/15" aria-hidden>
              <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={() => seekBy(-15)}
              className="flex h-12 cursor-pointer items-center justify-center border-2 border-foreground bg-surface font-heading text-xs font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-14"
              aria-label={text.seekBackward}
            >
              <RotateCcwIcon className="mr-2 size-4" /> 15
            </button>
            <button
              type="button"
              onClick={togglePlayback}
              className="flex size-20 cursor-pointer items-center justify-center bg-foreground text-background transition-transform duration-(--motion-fast) hover:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent sm:size-24"
              aria-label={isPlaying ? text.pause : text.play}
            >
              {isPlaying ? <PauseIcon className="size-8" /> : <PlayIcon className="ml-1 size-8" />}
            </button>
            <button
              type="button"
              onClick={() => seekBy(15)}
              className="flex h-12 cursor-pointer items-center justify-center border-2 border-foreground bg-surface font-heading text-xs font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-14"
              aria-label={text.seekForward}
            >
              15 <RotateCwIcon className="ml-2 size-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-foreground pt-4">
            <div className="flex gap-2">
              {[1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  aria-pressed={playbackRate === rate}
                  aria-label={text.speed(rate)}
                  className={cn(
                    "cursor-pointer border-2 border-foreground px-2.5 py-1 font-heading text-[11px] font-extrabold tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    playbackRate === rate
                      ? "bg-foreground text-background"
                      : "bg-background hover:bg-accent/10",
                  )}
                >
                  {rate}x
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={restart}
              className="cursor-pointer font-heading text-[11px] font-extrabold tracking-widest text-muted uppercase transition-colors duration-(--motion-fast) hover:text-accent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {text.restart}
            </button>
          </div>

          {audioError ? (
            <p role="alert" className="font-heading text-[12px] font-bold text-accent uppercase">
              {text.playbackError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="bg-surface">
        {visibleChunks.length > 0 ? (
          <ChunkWindow
            chunks={visibleChunks}
            onChunkSelect={(chunk) => handleSeekTo(chunk.start)}
          />
        ) : (
          emptyState
        )}
      </div>
    </section>
  );
}
