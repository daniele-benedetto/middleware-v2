const ROME_TIME_ZONE = "Europe/Rome";
const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const romePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ROME_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type DayParts = { year: number; month: number; day: number };

function parseDayKey(value: string | null | undefined): DayParts | null {
  const match = value ? DAY_KEY_PATTERN.exec(value) : null;
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? { year, month, day } : null;
}

/** Offset (ms) between the Rome wall clock and UTC at the given instant. */
function getRomeOffsetMs(instantMs: number) {
  const parts = Object.fromEntries(
    romePartsFormatter.formatToParts(new Date(instantMs)).map((part) => [part.type, part.value]),
  );
  const wallClockAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return wallClockAsUtc - Math.floor(instantMs / 1000) * 1000;
}

/** Instant (ms) of midnight Europe/Rome at the start of the given calendar day. */
function getRomeDayStartMs({ year, month, day }: DayParts) {
  const midnightAsUtc = Date.UTC(year, month - 1, day);
  // Midnight never falls inside a Rome DST transition (they happen at 02:00/03:00),
  // so resolving the offset twice converges on the exact instant.
  const guess = midnightAsUtc - getRomeOffsetMs(midnightAsUtc);
  return midnightAsUtc - getRomeOffsetMs(guess);
}

/** Returns the `YYYY-MM-DD` key when it is a real calendar day, otherwise `undefined`. */
export function normalizeDayKey(value: string | null | undefined) {
  return parseDayKey(value) ? (value as string) : undefined;
}

/** First instant of a Europe/Rome calendar day, as an ISO datetime with offset (`Z`). */
export function romeDayStartIso(dayKey: string) {
  const parts = parseDayKey(dayKey);
  return parts ? new Date(getRomeDayStartMs(parts)).toISOString() : undefined;
}

/** Last millisecond of a Europe/Rome calendar day (inclusive upper bound). */
export function romeDayEndIso(dayKey: string) {
  const parts = parseDayKey(dayKey);
  if (!parts) return undefined;
  const nextDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  const nextDayStart = getRomeDayStartMs({
    year: nextDay.getUTCFullYear(),
    month: nextDay.getUTCMonth() + 1,
    day: nextDay.getUTCDate(),
  });
  return new Date(nextDayStart - 1).toISOString();
}
