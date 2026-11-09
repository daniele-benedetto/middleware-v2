"use client";

import { BookmarkIcon, PauseIcon, PlayIcon, RotateCcwIcon, RotateCwIcon } from "lucide-react";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
  /** Square cover: small beside the title on mobile, large above it on desktop. */
  cover: ReactNode;
  /** Kicker, title and meta of the content being played. */
  info: ReactNode;
};

type SyncedTranscriptProps = {
  chunks: AudioChunk[];
  activeIndex: number;
  bookmarkedChunkIds: Set<string>;
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
/** The line being read sits at this fraction of the transcript height. */
const activeLineAnchor = 0.3;
const lineTransition = "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)";

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

/**
 * The whole text as one list that glides so the line being read stays at the
 * same height, as in synced lyrics. It only renders again when the line
 * changes; the movement is a CSS transform, so playback does not re-render it.
 */
const SyncedTranscript = memo(function SyncedTranscript({
  chunks,
  activeIndex,
  bookmarkedChunkIds,
  isScrubbing,
  emptyState,
}: SyncedTranscriptProps) {
  const text = i18n.public.listenPage;
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const previousIndexRef = useRef(activeIndex);
  const activeIndexRef = useRef(activeIndex);

  // Reads the active line from a ref, so it stays stable and the resize
  // observer below is created once (re-creating it would cancel the glide).
  const alignActiveLine = useCallback((animate: boolean) => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    const line = list?.children[activeIndexRef.current] as HTMLElement | undefined;
    if (!viewport || !list || !line) return;

    // Every line, the first one too, is read at the same height.
    const offset = line.offsetTop - viewport.clientHeight * activeLineAnchor;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.style.transition = animate && !reduceMotion ? lineTransition : "none";
    list.style.transform = `translate3d(0, ${-offset}px, 0)`;
  }, []);

  useLayoutEffect(() => {
    // A seek or a scrub jumps straight to the line; reading moves on smoothly.
    const isJump = isScrubbing || Math.abs(activeIndex - previousIndexRef.current) > 1;
    previousIndexRef.current = activeIndex;
    activeIndexRef.current = activeIndex;
    alignActiveLine(!isJump);
  }, [activeIndex, isScrubbing, alignActiveLine]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) return;

    // Realign only when the layout really changes (viewport height, text width).
    let lastSize = `${viewport.clientHeight}x${list.clientWidth}`;
    const observer = new ResizeObserver(() => {
      const size = `${viewport.clientHeight}x${list.clientWidth}`;
      if (size === lastSize) return;
      lastSize = size;
      alignActiveLine(false);
    });
    observer.observe(viewport);
    observer.observe(list);
    return () => observer.disconnect();
  }, [alignActiveLine]);

  if (chunks.length === 0) {
    return <div className="min-h-0 overflow-hidden">{emptyState}</div>;
  }

  return (
    <div
      ref={viewportRef}
      role="group"
      aria-label={text.syncedText}
      className="relative h-full min-h-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_82%,transparent)]"
    >
      <ol ref={listRef} className="list-none pb-[60%] will-change-transform">
        {chunks.map((chunk, index) => {
          const isActive = index === activeIndex;

          return (
            <li
              key={chunk.id}
              aria-hidden={isActive ? undefined : true}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "relative pr-7 pb-(--listen-line-gap) font-editorial text-[clamp(19px,5vw,24px)] leading-[1.32] tracking-[-0.015em] transition-colors duration-500 motion-reduce:transition-none lg:text-[clamp(22px,1.9vw,30px)]",
                isActive ? "text-foreground" : "text-foreground/28",
              )}
            >
              {chunk.text}
              {bookmarkedChunkIds.has(chunk.id) ? (
                <BookmarkIcon
                  className="absolute top-[0.3em] right-0 size-3.5 fill-accent text-accent sm:size-4"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
});

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
    <section className="grid w-full gap-3 sm:gap-4" aria-label={text.controlsAriaLabel}>
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
  cover,
  info,
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

  // `timeupdate` fires only a few times a second: while playing, follow the
  // audio clock on every frame so lines change exactly with the voice.
  useEffect(() => {
    if (!isPlaying) return;

    let frameId = 0;
    const followAudioClock = () => {
      const audio = audioRef.current;
      if (audio && !isScrubbingRef.current && pendingSeekTargetRef.current === null) {
        const audioTime = audio.currentTime;
        if (Number.isFinite(audioTime) && audioTime !== currentTimeRef.current) {
          currentTimeRef.current = audioTime;
          setCurrentTime(audioTime);
        }
      }
      frameId = window.requestAnimationFrame(followAudioClock);
    };

    frameId = window.requestAnimationFrame(followAudioClock);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying]);

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
    <section className="grid h-full min-h-0 w-full grid-cols-[4.5rem_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] gap-x-4 gap-y-5 [--listen-line-gap:0.85em] [grid-template-areas:'cover_info'_'lyrics_lyrics'_'controls_controls'] lg:grid-cols-[minmax(17rem,24rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto_auto] lg:gap-x-[clamp(3rem,6vw,7rem)] lg:gap-y-6 lg:[grid-template-areas:'cover_lyrics'_'info_lyrics'_'controls_lyrics']">
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

      {/* Desktop: the largest square that fits the space left above the title. */}
      <div className="aspect-square w-18 self-center [grid-area:cover] lg:flex lg:aspect-auto lg:size-full lg:min-h-0 lg:items-end lg:[container-type:size]">
        <div className="relative size-full overflow-hidden lg:aspect-square lg:size-auto lg:w-[min(100cqw,100cqh)]">
          {cover}
        </div>
      </div>

      <div className="min-w-0 self-center [grid-area:info]">{info}</div>

      <div className="min-h-0 [grid-area:lyrics]">
        <SyncedTranscript
          chunks={chunks}
          activeIndex={activeChunkIndex}
          bookmarkedChunkIds={bookmarkedChunkIds}
          isScrubbing={isScrubbing}
          emptyState={emptyState}
        />
      </div>

      <div className="relative z-20 [grid-area:controls]">
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
