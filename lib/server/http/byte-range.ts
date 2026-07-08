import "server-only";

export type ParsedByteRange = {
  start: number;
  end: number;
  size: number;
};

export function parseByteRangeHeader(value: string | null, totalSize: number) {
  if (!value) return null;
  if (!Number.isSafeInteger(totalSize) || totalSize <= 0) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return "invalid" as const;

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return "invalid" as const;

  if (!rawStart) {
    const suffixSize = Number(rawEnd);
    if (!Number.isSafeInteger(suffixSize) || suffixSize <= 0) return "invalid" as const;

    const size = Math.min(suffixSize, totalSize);
    return {
      start: totalSize - size,
      end: totalSize - 1,
      size,
    } satisfies ParsedByteRange;
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : totalSize - 1;

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return "invalid" as const;
  if (start < 0 || end < start || start >= totalSize) return "invalid" as const;

  const boundedEnd = Math.min(end, totalSize - 1);

  return {
    start,
    end: boundedEnd,
    size: boundedEnd - start + 1,
  } satisfies ParsedByteRange;
}
