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

export function parseAudioChunks(value: unknown): AudioChunk[] {
  if (!Array.isArray(value)) return [];

  return value
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
  return chunks.find((chunk) => currentTime >= chunk.start && currentTime < chunk.end) ?? null;
}

export function getVisibleAudioChunks(
  chunks: AudioChunk[],
  activeChunkId: string | null,
): VisibleAudioChunk[] {
  if (chunks.length === 0) return [];

  const activeIndex = Math.max(
    0,
    activeChunkId ? chunks.findIndex((chunk) => chunk.id === activeChunkId) : 0,
  );
  const boundedActiveIndex = activeIndex < 0 ? 0 : activeIndex;
  const startIndex = Math.min(Math.max(0, boundedActiveIndex - 1), Math.max(0, chunks.length - 3));

  return chunks.slice(startIndex, startIndex + 3).map((chunk, index) => {
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
