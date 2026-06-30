import "server-only";

export type MediaByteRange = {
  start: number;
  end: number;
  header: string;
};

export function parseMediaRangeHeader(value: string | null, size: number): MediaByteRange | null {
  if (!value) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());

  if (!match || size <= 0) {
    return null;
  }

  const [, rawStart, rawEnd] = match;

  if (!rawStart && !rawEnd) {
    return null;
  }

  if (!rawStart) {
    const suffixLength = Number(rawEnd);

    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return null;
    }

    const start = Math.max(size - suffixLength, 0);
    const end = size - 1;

    return { start, end, header: `bytes=${start}-${end}` };
  }

  const start = Number(rawStart);
  const requestedEnd = rawEnd ? Number(rawEnd) : size - 1;

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= size
  ) {
    return null;
  }

  const end = Math.min(requestedEnd, size - 1);

  return { start, end, header: `bytes=${start}-${end}` };
}

export function buildUnsatisfiedRangeHeader(size: number) {
  return `bytes */${Math.max(size, 0)}`;
}
