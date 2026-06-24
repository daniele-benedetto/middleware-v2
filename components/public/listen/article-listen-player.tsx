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
import { cn } from "@/lib/utils";

type ArticleListenPlayerProps = {
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  articleUpdatedAt: string;
  audioUrl: string;
  chunks: AudioChunk[];
  excerpt: string | null;
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
  if (chunks.length === 0) {
    return null;
  }

  return (
    <div
      className="grid min-h-65 content-center gap-5 sm:min-h-80"
      role="group"
      aria-label="Testo sincronizzato"
    >
      {chunks.map((chunk) => {
        const isActive = chunk.position === "active";

        return (
          <button
            key={chunk.id}
            type="button"
            onClick={() => onChunkSelect(chunk)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "group w-full cursor-pointer text-left font-editorial transition-[filter,opacity,transform,color] duration-(--motion-slow) focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-accent",
              isActive
                ? "scale-100 text-cream-on-dark opacity-100"
                : "scale-[0.98] text-cream-muted opacity-55 blur-[1px] hover:opacity-80 hover:blur-none motion-reduce:blur-none",
            )}
          >
            <span
              className={cn(
                "block leading-[1.18]",
                isActive
                  ? "text-[clamp(28px,4.7vw,62px)] font-semibold tracking-[-0.035em]"
                  : "text-[clamp(18px,2.2vw,28px)]",
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
  excerpt,
}: ArticleListenPlayerProps) {
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
  // Recompute the visible window only when the active chunk changes (crossing a
  // boundary), not on every ~4/sec timeupdate tick — this keeps ChunkWindow
  // from re-rendering on each tick.
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

  const seekBy = (seconds: number) => {
    const nextTime = seekTo(currentTime + seconds);
    if (nextTime === undefined) return;

    setHasInteracted(true);
    void persistProgress(isPlaying ? "listening" : "paused", nextTime);
  };

  const handleSeekTo = (seconds: number) => {
    const nextTime = seekTo(seconds);
    if (nextTime === undefined) return;

    setHasInteracted(true);
    void persistProgress(isPlaying ? "listening" : "paused", nextTime);
  };

  const restart = () => {
    setHasInteracted(true);
    seekTo(0);
    void deleteAudioProgress(articleId);
    setSavedProgress(null);
    startedAtRef.current = null;
    lastSavedBucketRef.current = -1;
  };

  return (
    <section className="grid min-h-[calc(100svh-170px)] gap-4 lg:grid-cols-[minmax(280px,420px)_1fr] lg:gap-5">
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

      <div className="flex min-h-0 flex-col justify-between border-2 border-foreground bg-background p-4 shadow-[8px_8px_0_0_var(--foreground)] sm:p-5 lg:p-6">
        <div>
          <p className="font-heading text-[11px] font-extrabold tracking-[0.16em] text-accent uppercase">
            Audiolettura
          </p>
          <h1 className="mt-3 font-heading text-[clamp(34px,5.4vw,72px)] leading-[0.88] font-black tracking-[-0.055em]">
            {articleTitle}
          </h1>
          {excerpt ? (
            <p className="mt-5 border-t-2 border-foreground pt-4 font-editorial text-[clamp(17px,1.7vw,22px)] leading-[1.32] text-body-text italic">
              {excerpt}
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5">
          <p role="status" className="sr-only">
            {isPlaying ? "Audiolettura in riproduzione" : "Audiolettura in pausa"}
          </p>
          {shouldOfferResume && savedProgress ? (
            <div
              role="status"
              className="border-2 border-accent bg-accent/10 p-3 font-heading text-[12px] font-bold tracking-[0.08em] uppercase"
            >
              Riprendi da {formatAudioTime(savedProgress.currentTime)}
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
              className="h-2 w-full cursor-pointer accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Avanzamento audiolettura"
              aria-valuetext={`${formatAudioTime(currentTime)} di ${formatAudioTime(resolvedDuration)}`}
            />
            <div className="flex items-center justify-between font-heading text-[12px] font-bold tracking-[0.08em] text-muted uppercase">
              <span>{formatAudioTime(currentTime)}</span>
              <span>{formatAudioTime(resolvedDuration)}</span>
            </div>
            <div className="h-1 bg-foreground/15" aria-hidden>
              <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <button
              type="button"
              onClick={() => seekBy(-15)}
              className="flex h-12 cursor-pointer items-center justify-center border-2 border-foreground bg-surface font-heading text-xs font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Torna indietro di 15 secondi"
            >
              <RotateCcwIcon className="mr-2 size-4" /> 15
            </button>
            <button
              type="button"
              onClick={togglePlayback}
              className="flex size-18 cursor-pointer items-center justify-center bg-foreground text-background transition-transform duration-(--motion-fast) hover:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent sm:size-20"
              aria-label={isPlaying ? "Metti in pausa" : "Avvia audiolettura"}
            >
              {isPlaying ? <PauseIcon className="size-7" /> : <PlayIcon className="ml-1 size-7" />}
            </button>
            <button
              type="button"
              onClick={() => seekBy(15)}
              className="flex h-12 cursor-pointer items-center justify-center border-2 border-foreground bg-surface font-heading text-xs font-black tracking-[0.08em] uppercase transition-colors duration-(--motion-fast) hover:bg-accent/15 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Vai avanti di 15 secondi"
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
                  aria-label={`Velocità ${rate}x`}
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
              Ricomincia
            </button>
          </div>

          {audioError ? (
            <p role="alert" className="font-heading text-[12px] font-bold text-accent uppercase">
              Non riesco ad avviare l&apos;audio. Riprova tra poco.
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-90 overflow-hidden border-2 border-foreground bg-foreground p-5 text-background shadow-[8px_8px_0_0_var(--accent)] sm:p-8 lg:min-h-0 lg:p-10">
        <div className="absolute top-4 right-4 font-heading text-[11px] font-extrabold tracking-[0.14em] text-cream-muted uppercase">
          Testo sincronizzato
        </div>
        {visibleChunks.length > 0 ? (
          <ChunkWindow
            chunks={visibleChunks}
            onChunkSelect={(chunk) => handleSeekTo(chunk.start)}
          />
        ) : (
          <div className="flex h-full min-h-65 items-center">
            <div className="max-w-2xl">
              <p className="font-heading text-[11px] font-extrabold tracking-[0.16em] text-accent uppercase">
                Solo audio
              </p>
              <p className="mt-4 font-editorial text-[clamp(28px,5vw,64px)] leading-[1.05] tracking-[-0.035em] text-cream-on-dark">
                Il testo sincronizzato non è disponibile per questo articolo.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
