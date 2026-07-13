"use client";

import { BookmarkIcon, PauseIcon, PlayIcon, RotateCcwIcon, RotateCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  formatAudioTime,
  getActiveAudioChunk,
  getVisibleAudioChunks,
  type AudioChunk,
  type VisibleAudioChunk,
} from "@/lib/audio/audio-chunks";
import {
  deleteAudioBookmark,
  getAudioBookmarkId,
  getAudioBookmarks,
  getAudioProgress,
  saveAudioBookmark,
  saveAudioProgress,
  type AudioBookmarkRecord,
  type AudioProgressRecord,
  type AudioProgressStatus,
} from "@/lib/browser/storage/audio-progress-store";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type ListenPlayerProps = {
  contentKind: "article" | "lesson";
  contentId: string;
  contentSlug: string;
  contentTitle: string;
  contentUpdatedAt: string;
  audioUrl: string;
  chunks: AudioChunk[];
  emptyState: ReactNode;
};

type SyncedTranscriptProps = {
  chunks: VisibleAudioChunk[];
  bookmarkedChunkIds: Set<string>;
  isScrubbing: boolean;
  onChunkSelect: (chunk: AudioChunk) => void;
  emptyState: ReactNode;
};

type ListenControlsProps = {
  bookmarks: AudioBookmarkRecord[];
  displayedTime: number;
  resolvedDuration: number;
  isPlaying: boolean;
  playbackRate: number;
  audioError: boolean;
  activeChunk: AudioChunk | null;
  activeChunkIsBookmarked: boolean;
  onBookmarkToggle: () => void;
  onSeekBy: (seconds: number) => void;
  onPlaybackToggle: () => void;
  onPlaybackRateCycle: () => void;
  onScrubStart: (seconds: number) => void;
  onScrubUpdate: (seconds: number) => void;
  onScrubCommit: () => void;
  onScrubCancel: () => void;
  parseTime: (value: string | number, fallback: number) => number;
};

const minimumResumeTime = 10;
const saveIntervalSeconds = 15;
const completionThresholdSeconds = 3;
const seekConfirmationToleranceSeconds = 0.75;
const playbackRates = [1, 1.25, 1.5] as const;

function formatPlaybackRate(rate: number) {
  return `${rate.toFixed(2)}x`;
}

function clampTime(value: number, duration: number) {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(duration) || duration <= 0) return Math.max(0, value);
  return Math.min(duration, Math.max(0, value));
}

function parseFiniteTime(value: string | number, fallback: number) {
  const nextValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
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

function SyncedTranscript({
  chunks,
  bookmarkedChunkIds,
  isScrubbing,
  onChunkSelect,
  emptyState,
}: SyncedTranscriptProps) {
  const text = i18n.public.listenPage;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chunkRefs = useRef(new Map<string, HTMLButtonElement>());
  const activeChunk = chunks.find((chunk) => chunk.position === "active");
  const firstRenderedChunkId = chunks[0]?.id ?? null;

  useEffect(() => {
    if (isScrubbing) return;
    if (!activeChunk) return;

    const frameId = window.requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      const element = chunkRefs.current.get(activeChunk.id);
      if (!container || !element) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const targetTop = firstRenderedChunkId === activeChunk.id ? 0 : element.offsetTop - 10;

      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeChunk, firstRenderedChunkId, isScrubbing]);

  if (chunks.length === 0) {
    return <div className="min-h-0 overflow-hidden">{emptyState}</div>;
  }

  return (
    <section className="min-h-0 overflow-hidden" role="group" aria-label={text.syncedText}>
      <div ref={scrollContainerRef} className="h-full overflow-y-auto pr-1">
        <div className="space-y-2 py-2 sm:space-y-3 sm:py-5">
          {chunks.map((chunk) => {
            const isActive = chunk.position === "active";
            const isBookmarked = bookmarkedChunkIds.has(chunk.id);

            return (
              <button
                key={chunk.id}
                ref={(element) => {
                  if (element) {
                    chunkRefs.current.set(chunk.id, element);
                    return;
                  }

                  chunkRefs.current.delete(chunk.id);
                }}
                type="button"
                onClick={() => onChunkSelect(chunk)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group flex w-full cursor-pointer items-start gap-2 text-left font-editorial transition-[opacity,transform,color,background-color] duration-(--motion-slow) ease-(--easing-standard) focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-accent",
                  isActive
                    ? "bg-background/45 py-1 pr-1 text-foreground opacity-100 motion-safe:animate-[listen-chunk-in_320ms_var(--easing-standard)] sm:py-1.5"
                    : "text-muted opacity-45 hover:text-body-text hover:opacity-80 sm:translate-x-1.5",
                )}
              >
                <span
                  className={cn(
                    "block min-w-0 flex-1",
                    isActive
                      ? "text-[clamp(17px,5.2vw,22px)] leading-[1.28] font-medium tracking-[-0.018em] sm:text-[clamp(20px,2.45vw,28px)] sm:leading-[1.3] sm:tracking-[-0.022em]"
                      : "pl-3 text-[clamp(12px,3.6vw,15px)] leading-[1.28] italic sm:pl-4 sm:text-[clamp(14px,1.2vw,17px)] sm:leading-[1.32]",
                  )}
                >
                  {chunk.text}
                </span>
                {isBookmarked ? (
                  <BookmarkIcon
                    className="mt-1 size-3.5 shrink-0 fill-accent text-accent sm:size-4"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ListenControls({
  bookmarks,
  displayedTime,
  resolvedDuration,
  isPlaying,
  playbackRate,
  audioError,
  activeChunk,
  activeChunkIsBookmarked,
  onBookmarkToggle,
  onSeekBy,
  onPlaybackToggle,
  onPlaybackRateCycle,
  onScrubStart,
  onScrubUpdate,
  onScrubCommit,
  onScrubCancel,
  parseTime,
}: ListenControlsProps) {
  const text = i18n.public.listenPage;

  return (
    <section
      className="mx-auto grid w-full max-w-3xl gap-2.5 sm:gap-3"
      aria-label="Controlli audio"
    >
      <p role="status" className="sr-only">
        {isPlaying ? text.playingStatus : text.pausedStatus}
      </p>

      <div className="grid gap-1.5 sm:gap-2">
        <div className="relative h-5">
          <div
            className="pointer-events-none absolute top-1/2 right-0 left-0 z-0 h-1.5 -translate-y-1/2 bg-foreground/15"
            aria-hidden
          />
          {bookmarks.map((bookmark) => {
            const segmentStart =
              resolvedDuration > 0 ? (bookmark.chunkStart / resolvedDuration) * 100 : 0;
            const segmentEnd =
              resolvedDuration > 0 ? (bookmark.chunkEnd / resolvedDuration) * 100 : segmentStart;
            const segmentWidth = Math.max(1.2, segmentEnd - segmentStart);

            return (
              <span
                key={bookmark.id}
                className="pointer-events-none absolute top-1/2 z-10 h-1.5 min-w-4 -translate-y-1/2 bg-foreground"
                style={{ left: `${segmentStart}%`, width: `${segmentWidth}%` }}
                aria-hidden
              />
            );
          })}
          <input
            type="range"
            min={0}
            max={resolvedDuration || 0}
            step="0.01"
            value={clampTime(displayedTime, resolvedDuration)}
            disabled={resolvedDuration <= 0}
            onPointerDown={(event) =>
              onScrubStart(parseTime(event.currentTarget.value, displayedTime))
            }
            onInput={(event) => onScrubUpdate(parseTime(event.currentTarget.value, displayedTime))}
            onChange={(event) => onScrubUpdate(parseTime(event.currentTarget.value, displayedTime))}
            onPointerUp={onScrubCommit}
            onPointerCancel={onScrubCancel}
            onKeyDown={(event) => {
              if (
                ![
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                  "PageUp",
                  "PageDown",
                ].includes(event.key)
              ) {
                return;
              }

              const input = event.currentTarget;
              window.requestAnimationFrame(() =>
                onScrubUpdate(parseTime(input.value, displayedTime)),
              );
              window.requestAnimationFrame(onScrubCommit);
            }}
            onBlur={(event) => {
              onScrubUpdate(parseTime(event.currentTarget.value, displayedTime));
              onScrubCommit();
            }}
            className="absolute top-1/2 right-0 left-0 z-20 h-5 w-full -translate-y-1/2 cursor-pointer opacity-70 accent-accent disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={text.progressAriaLabel}
            aria-valuetext={text.progressValueText(
              formatAudioTime(displayedTime),
              formatAudioTime(resolvedDuration),
            )}
          />
        </div>
        <div className="flex items-center justify-between font-heading text-[10px] font-bold tracking-[0.08em] text-muted uppercase sm:text-[11px]">
          <span>{formatAudioTime(displayedTime)}</span>
          <span>{formatAudioTime(resolvedDuration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={onBookmarkToggle}
          disabled={!activeChunk}
          aria-pressed={activeChunkIsBookmarked}
          className={cn(
            "inline-flex size-10 cursor-pointer items-center justify-center border-2 border-foreground font-heading text-[10px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-12 lg:size-13",
            activeChunkIsBookmarked
              ? "bg-accent text-background"
              : "bg-background hover:bg-accent/15",
          )}
          aria-label={activeChunkIsBookmarked ? "Rimuovi segnalibro" : "Aggiungi segnalibro"}
        >
          <BookmarkIcon
            className={cn("size-4", activeChunkIsBookmarked ? "fill-current" : undefined)}
          />
        </button>
        <button
          type="button"
          onClick={() => onSeekBy(-15)}
          className="inline-flex size-10 cursor-pointer items-center justify-center border-2 border-foreground bg-background font-heading text-[10px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-12 lg:size-13"
          aria-label={text.seekBackward}
        >
          <RotateCcwIcon className="size-5" />
        </button>
        <button
          type="button"
          onClick={onPlaybackToggle}
          className="flex size-15 cursor-pointer items-center justify-center bg-foreground text-background transition-transform duration-(--motion-fast) hover:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent sm:size-[4.25rem] lg:size-[4.75rem]"
          aria-label={isPlaying ? text.pause : text.play}
        >
          {isPlaying ? <PauseIcon className="size-6" /> : <PlayIcon className="ml-1 size-6" />}
        </button>
        <button
          type="button"
          onClick={() => onSeekBy(15)}
          className="inline-flex size-10 cursor-pointer items-center justify-center border-2 border-foreground bg-background font-heading text-[10px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-12 lg:size-13"
          aria-label={text.seekForward}
        >
          <RotateCwIcon className="size-5" />
        </button>
        <button
          type="button"
          onClick={onPlaybackRateCycle}
          className="inline-flex size-10 cursor-pointer items-center justify-center border-2 border-foreground bg-background font-heading text-[10px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-12 lg:size-13"
          aria-label={`Velocità ${formatPlaybackRate(playbackRate)}`}
        >
          {formatPlaybackRate(playbackRate)}
        </button>
      </div>

      {audioError ? (
        <p role="alert" className="font-heading text-[12px] font-bold text-accent uppercase">
          {text.playbackError}
        </p>
      ) : null}
    </section>
  );
}

export function ListenPlayer({
  contentKind,
  contentId,
  contentSlug,
  contentTitle,
  contentUpdatedAt,
  audioUrl,
  chunks,
  emptyState,
}: ListenPlayerProps) {
  const contentKey = `${contentKind}:${contentId}`;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const hasInteractedRef = useRef(false);
  const isScrubbingRef = useRef(false);
  const scrubTimeRef = useRef(0);
  const pendingSeekTargetRef = useRef<number | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const lastSavedBucketRef = useRef(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [, setSavedProgress] = useState<AudioProgressRecord | null>(null);
  const [bookmarks, setBookmarks] = useState<AudioBookmarkRecord[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState(false);
  const displayedTime = scrubTime ?? currentTime;
  const transcriptTime = isScrubbing ? currentTime : displayedTime;
  const activeChunk =
    getActiveAudioChunk(chunks, transcriptTime) ??
    chunks.findLast((chunk) => transcriptTime >= chunk.end) ??
    chunks[0] ??
    null;
  const activeChunkId = activeChunk?.id ?? null;
  const visibleChunks = useMemo(
    () => getVisibleAudioChunks(chunks, activeChunkId),
    [chunks, activeChunkId],
  );
  const resolvedDuration = duration > 0 ? duration : (chunks.at(-1)?.end ?? 0);
  const bookmarkedChunkIds = useMemo(
    () => new Set(bookmarks.map((bookmark) => bookmark.chunkId)),
    [bookmarks],
  );
  const activeChunkIsBookmarked = activeChunk ? bookmarkedChunkIds.has(activeChunk.id) : false;

  const persistProgress = useCallback(
    async (status: AudioProgressStatus = "listening", timeOverride?: number) => {
      const nextTime = Math.max(0, timeOverride ?? currentTimeRef.current);
      const resolvedRecordDuration = durationRef.current > 0 ? durationRef.current : null;
      const now = new Date().toISOString();
      const isCompleted = status === "completed";
      const record: AudioProgressRecord = {
        contentKey,
        contentKind,
        contentId,
        contentSlug,
        contentTitle,
        contentUpdatedAt,
        articleId: contentKey,
        articleSlug: contentSlug,
        articleTitle: contentTitle,
        articleUpdatedAt: contentUpdatedAt,
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
    [contentId, contentKey, contentKind, contentSlug, contentTitle, contentUpdatedAt, audioUrl],
  );

  useEffect(() => {
    currentTimeRef.current = currentTime;
    durationRef.current = resolvedDuration;
    hasInteractedRef.current = hasInteracted;
  }, [currentTime, hasInteracted, resolvedDuration]);

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      const record = await getAudioProgress(contentKey);
      if (cancelled) return;

      if (
        !record ||
        record.audioUrl !== audioUrl ||
        record.contentUpdatedAt !== contentUpdatedAt ||
        !isResumeCandidate(record)
      ) {
        setSavedProgress(null);
        startedAtRef.current = null;
        return;
      }

      setSavedProgress(record);
      startedAtRef.current = record.startedAt;
      lastSavedBucketRef.current = Math.floor(record.currentTime / saveIntervalSeconds);
      pendingSeekTargetRef.current = record.currentTime;
      const audio = audioRef.current;
      if (audio) audio.currentTime = record.currentTime;
      setCurrentTime(record.currentTime);
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [contentKey, contentUpdatedAt, audioUrl]);

  useEffect(() => {
    let cancelled = false;

    async function loadBookmarks() {
      const records = await getAudioBookmarks(contentKey);
      if (cancelled) return;
      setBookmarks(records ?? []);
    }

    void loadBookmarks();

    return () => {
      cancelled = true;
    };
  }, [contentKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = playbackRate;
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
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      handlePageHide();
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [persistProgress]);

  const syncDuration = (audio: HTMLAudioElement) => {
    const nextDuration = getFiniteDuration(audio);
    if (nextDuration > 0) setDuration(nextDuration);
  };

  const getPlaybackTime = () => {
    const audio = audioRef.current;
    const audioTime = audio?.currentTime;
    return typeof audioTime === "number" && Number.isFinite(audioTime)
      ? audioTime
      : currentTimeRef.current;
  };

  const getSeekDuration = () => {
    const audio = audioRef.current;
    return Math.max(
      audio ? getFiniteDuration(audio) : 0,
      resolvedDuration,
      currentTimeRef.current,
      0,
    );
  };

  const commitPlaybackTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return currentTimeRef.current;

    const audio = audioRef.current;
    const nextTime = clampTime(seconds, getSeekDuration());

    currentTimeRef.current = nextTime;
    pendingSeekTargetRef.current = nextTime;
    if (audio) {
      try {
        audio.currentTime = nextTime;
      } catch {
        setAudioError(true);
      }
    }
    setCurrentTime(nextTime);
    setScrubTime(null);
    scrubTimeRef.current = nextTime;
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    setHasInteracted(true);
    void persistProgress(isPlaying ? "listening" : "paused", nextTime);

    return nextTime;
  };

  const beginScrubbing = (seconds: number) => {
    const nextTime = clampTime(seconds, getSeekDuration());
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    scrubTimeRef.current = nextTime;
    setScrubTime(nextTime);
  };

  const updateScrubbing = (seconds: number) => {
    if (!isScrubbingRef.current) {
      beginScrubbing(seconds);
      return;
    }

    const nextTime = clampTime(seconds, getSeekDuration());
    scrubTimeRef.current = nextTime;
    setScrubTime(nextTime);
  };

  const commitScrubbing = () => {
    if (!isScrubbingRef.current) return;
    commitPlaybackTime(scrubTimeRef.current);
  };

  const cancelScrubbing = () => {
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    scrubTimeRef.current = currentTimeRef.current;
    setScrubTime(null);
  };

  const syncPlaybackTime = (audio: HTMLAudioElement) => {
    const audioTime = audio.currentTime;
    if (!Number.isFinite(audioTime)) return;

    const pendingSeekTarget = pendingSeekTargetRef.current;
    if (pendingSeekTarget !== null) {
      if (Math.abs(audioTime - pendingSeekTarget) <= seekConfirmationToleranceSeconds) {
        pendingSeekTargetRef.current = null;
      } else {
        try {
          audio.currentTime = pendingSeekTarget;
        } catch {
          setAudioError(true);
        }
        return;
      }
    }

    currentTimeRef.current = audioTime;
    setCurrentTime(audioTime);
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

  const seekBy = (seconds: number) => commitPlaybackTime(getPlaybackTime() + seconds);
  const handleSeekTo = (seconds: number) => commitPlaybackTime(seconds);

  const cyclePlaybackRate = () => {
    const currentIndex = playbackRates.findIndex((rate) => rate === playbackRate);
    const nextRate = playbackRates[(currentIndex + 1) % playbackRates.length] ?? 1;
    setPlaybackRate(nextRate);
  };

  const toggleActiveChunkBookmark = () => {
    if (!activeChunk) return;

    const bookmarkId = getAudioBookmarkId(contentKey, activeChunk.id);
    const existingBookmark = bookmarks.find((bookmark) => bookmark.id === bookmarkId);

    if (existingBookmark) {
      setBookmarks((current) => current.filter((bookmark) => bookmark.id !== bookmarkId));
      void deleteAudioBookmark(contentKey, activeChunk.id);
      return;
    }

    const bookmark: AudioBookmarkRecord = {
      id: bookmarkId,
      contentKey,
      contentKind,
      contentId,
      contentSlug,
      contentTitle,
      contentUpdatedAt,
      articleId: contentKey,
      articleSlug: contentSlug,
      articleTitle: contentTitle,
      articleUpdatedAt: contentUpdatedAt,
      audioUrl,
      chunkId: activeChunk.id,
      chunkStart: activeChunk.start,
      chunkEnd: activeChunk.end,
      chunkText: activeChunk.text,
      createdAt: new Date().toISOString(),
    };

    setBookmarks((current) => [...current, bookmark]);
    void saveAudioBookmark(bookmark);
  };

  return (
    <section className="mx-auto grid h-full min-h-0 w-full max-w-5xl grid-rows-[minmax(0,1fr)_auto] gap-3 sm:grid-rows-[auto_minmax(0,1fr)] sm:gap-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(event) => syncDuration(event.currentTarget)}
        onDurationChange={(event) => syncDuration(event.currentTarget)}
        onCanPlay={(event) => {
          syncDuration(event.currentTarget);
          const pendingSeekTarget = pendingSeekTargetRef.current;
          if (pendingSeekTarget === null) return;

          try {
            event.currentTarget.currentTime = pendingSeekTarget;
          } catch {
            setAudioError(true);
          }
        }}
        onSeeked={(event) => {
          syncDuration(event.currentTarget);
          syncPlaybackTime(event.currentTarget);
        }}
        onTimeUpdate={(event) => {
          syncDuration(event.currentTarget);
          if (isScrubbingRef.current) return;
          syncPlaybackTime(event.currentTarget);
        }}
        onPlay={(event) => {
          syncDuration(event.currentTarget);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onError={() => setAudioError(true)}
        onEnded={(event) => {
          if (pendingSeekTargetRef.current !== null) return;

          const completedTime = getFiniteDuration(event.currentTarget) || resolvedDuration;
          currentTimeRef.current = completedTime;
          setCurrentTime(completedTime);
          setScrubTime(null);
          isScrubbingRef.current = false;
          setIsScrubbing(false);
          setIsPlaying(false);
          void persistProgress("completed", completedTime);
        }}
      />

      <div className="min-h-0 bg-background sm:order-2">
        <SyncedTranscript
          chunks={visibleChunks}
          bookmarkedChunkIds={bookmarkedChunkIds}
          isScrubbing={isScrubbing}
          onChunkSelect={(chunk) => handleSeekTo(chunk.start)}
          emptyState={emptyState}
        />
      </div>

      <div className="relative z-20 -mx-(--article-padding-x) border-t-2 border-foreground bg-background px-(--article-padding-x) pt-3 pb-2 shadow-[0_-16px_28px_rgba(247,240,231,0.95)] sm:order-1 sm:mx-0 sm:border-t-0 sm:px-0 sm:pt-0 sm:pb-0 sm:shadow-none">
        <ListenControls
          bookmarks={bookmarks}
          displayedTime={displayedTime}
          resolvedDuration={resolvedDuration}
          isPlaying={isPlaying}
          playbackRate={playbackRate}
          audioError={audioError}
          activeChunk={activeChunk}
          activeChunkIsBookmarked={activeChunkIsBookmarked}
          onBookmarkToggle={toggleActiveChunkBookmark}
          onSeekBy={seekBy}
          onPlaybackToggle={togglePlayback}
          onPlaybackRateCycle={cyclePlaybackRate}
          onScrubStart={beginScrubbing}
          onScrubUpdate={updateScrubbing}
          onScrubCommit={commitScrubbing}
          onScrubCancel={cancelScrubbing}
          parseTime={parseFiniteTime}
        />
      </div>
    </section>
  );
}
