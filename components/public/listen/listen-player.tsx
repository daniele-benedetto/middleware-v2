"use client";

import { BookmarkIcon, PauseIcon, PlayIcon, RotateCcwIcon, RotateCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  formatAudioTime,
  getCurrentAudioChunkIndex,
  type AudioChunk,
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
import {
  getAudioDurationBucket,
  getAudioPositionBucket,
  publicAnalyticsEvents,
  trackPublicAnalyticsEvent,
} from "@/lib/public/analytics";
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
  chunk: AudioChunk | null;
  upcomingChunks: AudioChunk[];
  bookmarkedChunkIds: Set<string>;
  currentTime: number;
  isPlaying: boolean;
  isScrubbing: boolean;
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
  onRetry: () => void;
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
const audioProgressMilestones = [25, 50, 75] as const;

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
  chunk,
  upcomingChunks,
  bookmarkedChunkIds,
  currentTime,
  isPlaying,
  isScrubbing,
  emptyState,
}: SyncedTranscriptProps) {
  const text = i18n.public.listenPage;
  const readingRef = useRef<HTMLDivElement>(null);
  const activeChunkRef = useRef<HTMLDivElement>(null);
  const playbackTimeRef = useRef(currentTime);
  const maxScrollTopRef = useRef(0);

  useEffect(() => {
    playbackTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    const reading = readingRef.current;
    if (!reading || !chunk) return;

    const activeChunk = activeChunkRef.current;
    maxScrollTopRef.current = activeChunk
      ? Math.max(0, activeChunk.scrollHeight - reading.clientHeight)
      : 0;
    reading.scrollTop = 0;
  }, [chunk]);

  useEffect(() => {
    const reading = readingRef.current;
    if (!reading || !chunk) return;

    const getTargetScrollTop = () => {
      const duration = Math.max(chunk.end - chunk.start, 0.001);
      const progress = Math.min(1, Math.max(0, (playbackTimeRef.current - chunk.start) / duration));
      return maxScrollTopRef.current * progress;
    };

    if (!isPlaying || isScrubbing) {
      const frameId = window.requestAnimationFrame(() => {
        reading.scrollTop = getTargetScrollTop();
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    let frameId = 0;
    const followPlayback = () => {
      const targetScrollTop = getTargetScrollTop();
      const distance = targetScrollTop - reading.scrollTop;
      reading.scrollTop += distance * 0.18;
      frameId = window.requestAnimationFrame(followPlayback);
    };

    frameId = window.requestAnimationFrame(followPlayback);
    return () => window.cancelAnimationFrame(frameId);
  }, [chunk, isPlaying, isScrubbing]);

  if (!chunk) {
    return <div className="min-h-0 overflow-hidden">{emptyState}</div>;
  }

  const isBookmarked = bookmarkedChunkIds.has(chunk.id);

  return (
    <section
      className="flex min-h-0 flex-col overflow-hidden"
      role="group"
      aria-label={text.syncedText}
    >
      <div ref={readingRef} className="relative min-h-0 flex-1 overflow-hidden py-2 sm:py-5">
        <div className="relative z-10">
          <div
            ref={activeChunkRef}
            className="relative flex items-start gap-2 py-1 pr-8 font-editorial text-foreground sm:py-1.5"
          >
            <span className="block min-w-0 flex-1 text-[clamp(17px,5.2vw,22px)] leading-[1.28] font-medium tracking-[-0.018em] sm:text-[clamp(20px,2.45vw,28px)] sm:leading-[1.3] sm:tracking-[-0.022em]">
              {chunk.text}
            </span>
            {isBookmarked ? (
              <BookmarkIcon
                className="absolute top-1 right-0 size-3.5 fill-accent text-accent sm:top-1.5 sm:size-4"
                aria-hidden
              />
            ) : null}
          </div>
          {upcomingChunks.map((upcomingChunk) => (
            <div
              key={upcomingChunk.id}
              aria-hidden
              className="relative mt-5 flex items-start gap-2 pr-8 font-editorial text-[clamp(16px,4.8vw,21px)] leading-[1.28] tracking-[-0.012em] text-muted/45 sm:text-[clamp(19px,2.2vw,26px)] sm:leading-[1.3]"
            >
              <span className="min-w-0 flex-1">{upcomingChunk.text}</span>
              {bookmarkedChunkIds.has(upcomingChunk.id) ? (
                <BookmarkIcon
                  className="absolute top-1 right-0 size-3.5 fill-accent text-accent sm:top-1.5 sm:size-4"
                  aria-hidden
                />
              ) : null}
            </div>
          ))}
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
  onRetry,
  onScrubStart,
  onScrubUpdate,
  onScrubCommit,
  onScrubCancel,
  parseTime,
}: ListenControlsProps) {
  const text = i18n.public.listenPage;

  return (
    <section
      className="mx-auto grid w-full max-w-3xl gap-3 sm:gap-4"
      aria-label={text.controlsAriaLabel}
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
            className="absolute top-1/2 right-0 left-0 z-20 h-11 w-full -translate-y-1/2 cursor-pointer opacity-70 accent-accent disabled:cursor-not-allowed disabled:opacity-30"
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
            "inline-flex size-11 cursor-pointer items-center justify-center border-2 border-foreground font-heading text-[10px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-12 lg:size-13",
            activeChunkIsBookmarked
              ? "bg-accent text-background"
              : "bg-background hover:bg-accent/15",
          )}
          aria-label={activeChunkIsBookmarked ? text.removeBookmark : text.addBookmark}
        >
          <BookmarkIcon
            className={cn("size-4", activeChunkIsBookmarked ? "fill-current" : undefined)}
          />
        </button>
        <button
          type="button"
          onClick={() => onSeekBy(-15)}
          className="inline-flex size-11 cursor-pointer items-center justify-center border-2 border-foreground bg-background font-heading text-[10px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-12 lg:size-13"
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
          className="inline-flex size-11 cursor-pointer items-center justify-center border-2 border-foreground bg-background font-heading text-[10px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-12 lg:size-13"
          aria-label={text.seekForward}
        >
          <RotateCwIcon className="size-5" />
        </button>
        <button
          type="button"
          onClick={onPlaybackRateCycle}
          className="inline-flex size-11 cursor-pointer items-center justify-center border-2 border-foreground bg-background font-heading text-[10px] font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-12 lg:size-13"
          aria-label={text.speed(formatPlaybackRate(playbackRate))}
        >
          {formatPlaybackRate(playbackRate)}
        </button>
      </div>

      {audioError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-2 border-accent p-3"
        >
          <p className="font-heading text-[12px] font-bold text-accent uppercase">
            {text.playbackError}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 border-2 border-accent px-3 py-2 font-heading text-[11px] font-black tracking-[0.08em] text-accent uppercase transition-colors hover:bg-accent hover:text-background focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {text.retryPlayback}
          </button>
        </div>
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
  const playTrackedRef = useRef(false);
  const completedTrackedRef = useRef(false);
  const trackedMilestonesRef = useRef(new Set<number>());
  const lastSavedBucketRef = useRef(-1);
  const playbackFrameRef = useRef<number | null>(null);
  const pendingPlaybackTimeRef = useRef(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [bookmarks, setBookmarks] = useState<AudioBookmarkRecord[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState(false);
  const displayedTime = scrubTime ?? currentTime;
  const activeChunkIndex = getCurrentAudioChunkIndex(chunks, currentTime);
  const activeChunk = chunks[activeChunkIndex] ?? null;
  const upcomingChunks = chunks.slice(activeChunkIndex + 1, activeChunkIndex + 6);
  const resolvedDuration = duration > 0 ? duration : (chunks.at(-1)?.end ?? 0);
  const bookmarkedChunkIds = useMemo(
    () => new Set(bookmarks.map((bookmark) => bookmark.chunkId)),
    [bookmarks],
  );
  const activeChunkIsBookmarked = activeChunk ? bookmarkedChunkIds.has(activeChunk.id) : false;

  const getAudioAnalyticsData = () => ({
    content_type: contentKind,
    slug: contentSlug,
    duration_bucket: getAudioDurationBucket(durationRef.current || resolvedDuration),
    has_transcript: chunks.length > 0,
  });

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
    },
    [contentId, contentKey, contentKind, contentSlug, contentTitle, contentUpdatedAt, audioUrl],
  );

  useEffect(() => {
    currentTimeRef.current = currentTime;
    durationRef.current = resolvedDuration;
    hasInteractedRef.current = hasInteracted;
  }, [currentTime, hasInteracted, resolvedDuration]);

  useEffect(() => {
    return () => {
      if (playbackFrameRef.current !== null) {
        window.cancelAnimationFrame(playbackFrameRef.current);
      }
    };
  }, []);

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
        startedAtRef.current = null;
        return;
      }

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
    if (nextDuration > 0 && nextDuration !== durationRef.current) {
      durationRef.current = nextDuration;
      setDuration(nextDuration);
    }
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
    pendingPlaybackTimeRef.current = audioTime;
    if (playbackFrameRef.current === null) {
      playbackFrameRef.current = window.requestAnimationFrame(() => {
        playbackFrameRef.current = null;
        setCurrentTime(pendingPlaybackTimeRef.current);
      });
    }

    const nextDuration = durationRef.current || getFiniteDuration(audio) || resolvedDuration;
    if (nextDuration <= 0) return;

    const progress = (audioTime / nextDuration) * 100;
    const milestone = audioProgressMilestones.find(
      (value) => progress >= value && !trackedMilestonesRef.current.has(value),
    );

    if (!milestone) return;

    trackedMilestonesRef.current.add(milestone);
    trackPublicAnalyticsEvent(publicAnalyticsEvents.audioProgress, {
      ...getAudioAnalyticsData(),
      milestone,
    });
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
        trackPublicAnalyticsEvent(publicAnalyticsEvents.audioError, getAudioAnalyticsData());
      });
      return;
    }

    audio.pause();
    void persistProgress("paused");
  };

  const seekBy = (seconds: number) => commitPlaybackTime(getPlaybackTime() + seconds);

  const cyclePlaybackRate = () => {
    const currentIndex = playbackRates.findIndex((rate) => rate === playbackRate);
    const nextRate = playbackRates[(currentIndex + 1) % playbackRates.length] ?? 1;
    setPlaybackRate(nextRate);
  };

  const retryPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    setAudioError(false);
    audio.load();
    trackPublicAnalyticsEvent(publicAnalyticsEvents.audioRetry, getAudioAnalyticsData());
    void audio.play().catch(() => {
      setAudioError(true);
      trackPublicAnalyticsEvent(publicAnalyticsEvents.audioError, getAudioAnalyticsData());
    });
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

    trackPublicAnalyticsEvent(publicAnalyticsEvents.audioBookmarkAdd, {
      ...getAudioAnalyticsData(),
      position_bucket: getAudioPositionBucket(
        activeChunk.start,
        durationRef.current || resolvedDuration,
      ),
    });

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
    <section className="mx-auto grid h-full min-h-0 w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)] gap-3 sm:gap-6">
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
          if (!playTrackedRef.current) {
            playTrackedRef.current = true;
            trackPublicAnalyticsEvent(publicAnalyticsEvents.audioPlay, getAudioAnalyticsData());
          } else if (currentTimeRef.current >= minimumResumeTime) {
            trackPublicAnalyticsEvent(publicAnalyticsEvents.audioResume, {
              ...getAudioAnalyticsData(),
              position_bucket: getAudioPositionBucket(
                currentTimeRef.current,
                durationRef.current || resolvedDuration,
              ),
            });
          }
        }}
        onPause={() => {
          setIsPlaying(false);
          if (currentTimeRef.current < (durationRef.current || resolvedDuration)) {
            trackPublicAnalyticsEvent(publicAnalyticsEvents.audioPause, getAudioAnalyticsData());
          }
        }}
        onError={() => {
          setAudioError(true);
          trackPublicAnalyticsEvent(publicAnalyticsEvents.audioError, getAudioAnalyticsData());
        }}
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
          if (!completedTrackedRef.current) {
            completedTrackedRef.current = true;
            trackPublicAnalyticsEvent(publicAnalyticsEvents.audioComplete, getAudioAnalyticsData());
          }
        }}
      />

      <div className="order-2 flex min-h-0 bg-background">
        <SyncedTranscript
          chunk={activeChunk}
          upcomingChunks={upcomingChunks}
          bookmarkedChunkIds={bookmarkedChunkIds}
          currentTime={currentTime}
          isPlaying={isPlaying}
          isScrubbing={isScrubbing}
          emptyState={emptyState}
        />
      </div>

      <div className="order-1 relative z-20 -mx-(--article-padding-x) bg-background px-(--article-padding-x) pt-1 pb-4 sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0">
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
          onRetry={retryPlayback}
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
