export type AudioChunk = {
  id: string;
  text: string;
  start: number;
  end: number;
  confidence: number | null;
};

export type VisibleAudioChunk = AudioChunk & {
  position: "previous" | "active" | "next";
};

export const DEFAULT_VISIBLE_AUDIO_CHUNK_COUNT = 24;

function resolveAudioChunkItems(value: unknown) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  const payload = value as { chunks?: unknown };
  return Array.isArray(payload.chunks) ? payload.chunks : [];
}

export function parseAudioChunks(value: unknown): AudioChunk[] {
  return resolveAudioChunkItems(value)
    .map((item): AudioChunk | null => {
      if (!item || typeof item !== "object") return null;

      const chunk = item as {
        id?: unknown;
        text?: unknown;
        start?: unknown;
        end?: unknown;
        confidence?: unknown;
      };

      if (typeof chunk.text !== "string" || chunk.text.trim().length === 0) return null;
      if (typeof chunk.start !== "number" || typeof chunk.end !== "number") return null;
      if (!Number.isFinite(chunk.start) || !Number.isFinite(chunk.end)) return null;
      if (chunk.end <= chunk.start) return null;

      return {
        id:
          typeof chunk.id === "string" || typeof chunk.id === "number"
            ? String(chunk.id)
            : `${chunk.start}`,
        text: chunk.text.trim(),
        start: chunk.start,
        end: chunk.end,
        confidence:
          typeof chunk.confidence === "number" && Number.isFinite(chunk.confidence)
            ? chunk.confidence
            : null,
      };
    })
    .filter((chunk): chunk is AudioChunk => chunk !== null)
    .sort((a, b) => a.start - b.start);
}

export function getActiveAudioChunk(chunks: AudioChunk[], currentTime: number) {
  const index = getActiveAudioChunkIndex(chunks, currentTime);
  return index >= 0 ? (chunks[index] ?? null) : null;
}

export function getActiveAudioChunkIndex(chunks: AudioChunk[], currentTime: number) {
  let low = 0;
  let high = chunks.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const chunk = chunks[middle];

    if (!chunk) return -1;
    if (currentTime < chunk.start) {
      high = middle - 1;
    } else if (currentTime >= chunk.end) {
      low = middle + 1;
    } else {
      return middle;
    }
  }

  return -1;
}

export function getCurrentAudioChunkIndex(chunks: AudioChunk[], currentTime: number) {
  const activeIndex = getActiveAudioChunkIndex(chunks, currentTime);
  if (activeIndex >= 0) return activeIndex;

  let low = 0;
  let high = chunks.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const chunk = chunks[middle];

    if (!chunk) return 0;
    if (chunk.start <= currentTime) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return Math.max(0, high);
}

export function getVisibleAudioChunks(
  chunks: AudioChunk[],
  activeChunkIndex: number,
  maximumCount = DEFAULT_VISIBLE_AUDIO_CHUNK_COUNT,
): VisibleAudioChunk[] {
  if (chunks.length === 0) return [];

  const boundedActiveIndex = Math.min(Math.max(activeChunkIndex, 0), chunks.length - 1);
  const safeMaximumCount = Math.max(1, maximumCount);
  const previousCount = Math.min(1, safeMaximumCount - 1);
  const startIndex = Math.max(0, boundedActiveIndex - previousCount);
  const endIndex = Math.min(chunks.length, startIndex + safeMaximumCount);

  return chunks.slice(startIndex, endIndex).map((chunk, index) => {
    const absoluteIndex = startIndex + index;

    return {
      ...chunk,
      position:
        absoluteIndex === boundedActiveIndex
          ? "active"
          : absoluteIndex < boundedActiveIndex
            ? "previous"
            : "next",
    };
  });
}

export function formatAudioTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
