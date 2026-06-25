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
  saveAudioProgress,
  saveAudioBookmark,
  type AudioBookmarkRecord,
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
  emptyState: ReactNode;
};

type ChunkWindowProps = {
  chunks: VisibleAudioChunk[];
  bookmarkedChunkIds: Set<string>;
  onChunkSelect: (chunk: AudioChunk) => void;
};

const minimumResumeTime = 10;
const saveIntervalSeconds = 15;
const completionThresholdSeconds = 3;
const playbackRates = [1, 1.25, 1.5] as const;

function formatPlaybackRate(rate: number) {
  return `${rate.toFixed(2)}x`;
}

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

function ChunkWindow({ chunks, bookmarkedChunkIds, onChunkSelect }: ChunkWindowProps) {
  const text = i18n.public.listenPage;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chunkRefs = useRef(new Map<string, HTMLButtonElement>());
  const activeChunk = chunks.find((chunk) => chunk.position === "active");

  useEffect(() => {
    if (!activeChunk) return;

    const container = scrollContainerRef.current;
    const element = chunkRefs.current.get(activeChunk.id);
    if (!container || !element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targetTop = element.offsetTop - container.clientHeight / 2 + element.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [activeChunk]);

  if (chunks.length === 0) {
    return null;
  }

  return (
    <div
      className="h-full min-h-0 overflow-hidden pt-4 sm:pt-5"
      role="group"
      aria-label={text.syncedText}
    >
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="grid min-h-full content-center gap-3 py-4 sm:gap-3.5 sm:py-5">
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
                  "group flex w-full cursor-pointer items-start gap-2 text-left font-editorial transition-[opacity,transform,color] duration-(--motion-slow) focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-accent",
                  isActive
                    ? "translate-x-0 text-foreground opacity-100"
                    : "translate-x-0 text-muted opacity-45 hover:text-body-text hover:opacity-80 sm:translate-x-1.5",
                )}
              >
                <span
                  className={cn(
                    "block min-w-0 flex-1 leading-[1.24]",
                    isActive
                      ? "text-[clamp(22px,3vw,34px)] font-medium tracking-[-0.025em]"
                      : "pl-4 text-[clamp(15px,1.45vw,19px)] italic",
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
  emptyState,
}: ArticleListenPlayerProps) {
  const text = i18n.public.listenPage;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const hasInteractedRef = useRef(false);
  const isSeekingRef = useRef(false);
  const startedAtRef = useRef<string | null>(null);
  const lastSavedBucketRef = useRef(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekPreviewTime, setSeekPreviewTime] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [, setSavedProgress] = useState<AudioProgressRecord | null>(null);
  const [bookmarks, setBookmarks] = useState<AudioBookmarkRecord[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState(false);
  const displayedTime = seekPreviewTime ?? currentTime;
  const activeChunk =
    getActiveAudioChunk(chunks, displayedTime) ??
    chunks.findLast((chunk) => displayedTime >= chunk.end) ??
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
    let cancelled = false;

    async function loadBookmarks() {
      const records = await getAudioBookmarks(articleId);
      if (cancelled) return;

      setBookmarks(records ?? []);
    }

    void loadBookmarks();

    return () => {
      cancelled = true;
    };
  }, [articleId]);

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
    currentTimeRef.current = nextTime;
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

    isSeekingRef.current = false;
    setSeekPreviewTime(null);
    setHasInteracted(true);
    void persistProgress(isPlaying ? "listening" : "paused", nextTime);
  };

  const seekBy = (seconds: number) => commitSeek(currentTimeRef.current + seconds);

  const handleSeekTo = (seconds: number) => commitSeek(seconds);

  const previewSeekTo = (seconds: number) => {
    isSeekingRef.current = true;
    setSeekPreviewTime(clampTime(seconds, resolvedDuration));
  };

  const commitPreviewSeek = (seconds: number) => {
    handleSeekTo(seconds);
  };

  const cyclePlaybackRate = () => {
    const currentIndex = playbackRates.findIndex((rate) => rate === playbackRate);
    const nextRate = playbackRates[(currentIndex + 1) % playbackRates.length] ?? playbackRates[0];
    setPlaybackRate(nextRate);
  };

  const toggleActiveChunkBookmark = () => {
    if (!activeChunk) return;

    const bookmarkId = getAudioBookmarkId(articleId, activeChunk.id);
    const existingBookmark = bookmarks.find((bookmark) => bookmark.id === bookmarkId);

    if (existingBookmark) {
      setBookmarks((current) => current.filter((bookmark) => bookmark.id !== bookmarkId));
      void deleteAudioBookmark(articleId, activeChunk.id);
      return;
    }

    const bookmark: AudioBookmarkRecord = {
      id: bookmarkId,
      articleId,
      articleSlug,
      articleTitle,
      articleUpdatedAt,
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
    <section className="mx-auto grid h-full min-h-0 w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)] gap-4 sm:gap-5">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(event) => syncDuration(event.currentTarget)}
        onDurationChange={(event) => syncDuration(event.currentTarget)}
        onCanPlay={(event) => syncDuration(event.currentTarget)}
        onTimeUpdate={(event) => {
          syncDuration(event.currentTarget);
          if (isSeekingRef.current) return;
          currentTimeRef.current = event.currentTarget.currentTime;
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

      <div className="grid gap-3 sm:gap-4">
        <div className="grid gap-3">
          <p role="status" className="sr-only">
            {isPlaying ? text.playingStatus : text.pausedStatus}
          </p>

          <div className="grid gap-2">
            <div className="relative h-5">
              <div
                className="pointer-events-none absolute top-1/2 right-0 left-0 z-0 h-1.5 -translate-y-1/2 bg-foreground/15"
                aria-hidden
              />
              {bookmarks.map((bookmark) => {
                const segmentStart =
                  resolvedDuration > 0 ? (bookmark.chunkStart / resolvedDuration) * 100 : 0;
                const segmentEnd =
                  resolvedDuration > 0
                    ? (bookmark.chunkEnd / resolvedDuration) * 100
                    : segmentStart;
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
                onPointerDown={(event) => previewSeekTo(Number(event.currentTarget.value))}
                onInput={(event) => previewSeekTo(Number(event.currentTarget.value))}
                onChange={(event) => previewSeekTo(Number(event.currentTarget.value))}
                onPointerUp={(event) => commitPreviewSeek(Number(event.currentTarget.value))}
                onPointerCancel={(event) => commitPreviewSeek(Number(event.currentTarget.value))}
                onKeyUp={(event) => commitPreviewSeek(Number(event.currentTarget.value))}
                onBlur={(event) => {
                  if (!isSeekingRef.current) return;
                  commitPreviewSeek(Number(event.currentTarget.value));
                }}
                className="absolute top-1/2 right-0 left-0 z-20 h-5 w-full -translate-y-1/2 cursor-pointer opacity-70 accent-accent disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={text.progressAriaLabel}
                aria-valuetext={text.progressValueText(
                  formatAudioTime(displayedTime),
                  formatAudioTime(resolvedDuration),
                )}
              />
            </div>
            <div className="flex items-center justify-between font-heading text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
              <span>{formatAudioTime(displayedTime)}</span>
              <span>{formatAudioTime(resolvedDuration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleActiveChunkBookmark}
              aria-pressed={activeChunkIsBookmarked}
              className={cn(
                "inline-flex size-12 cursor-pointer items-center justify-center border-2 border-foreground font-heading text-[11px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-13",
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
              onClick={() => seekBy(-15)}
              className="inline-flex size-12 cursor-pointer items-center justify-center border-2 border-foreground bg-background font-heading text-[11px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-13"
              aria-label={text.seekBackward}
            >
              <RotateCcwIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={togglePlayback}
              className="flex size-[4.25rem] cursor-pointer items-center justify-center bg-foreground text-background transition-transform duration-(--motion-fast) hover:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent sm:size-[4.75rem]"
              aria-label={isPlaying ? text.pause : text.play}
            >
              {isPlaying ? <PauseIcon className="size-6" /> : <PlayIcon className="ml-1 size-6" />}
            </button>
            <button
              type="button"
              onClick={() => seekBy(15)}
              className="inline-flex size-12 cursor-pointer items-center justify-center border-2 border-foreground bg-background font-heading text-[11px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-13"
              aria-label={text.seekForward}
            >
              <RotateCwIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={cyclePlaybackRate}
              className="inline-flex size-12 cursor-pointer items-center justify-center border-2 border-foreground bg-background font-heading text-[11px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-13"
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
        </div>
      </div>

      <div className="min-h-0 bg-surface">
        {visibleChunks.length > 0 ? (
          <ChunkWindow
            chunks={visibleChunks}
            bookmarkedChunkIds={bookmarkedChunkIds}
            onChunkSelect={(chunk) => handleSeekTo(chunk.start)}
          />
        ) : (
          emptyState
        )}
      </div>
    </section>
  );
}
