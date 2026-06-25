import { i18n } from "@/lib/i18n";

const { monthsShort, seasons } = i18n.public.issueFormat;

export function formatIssueNumber(positionFromOldest: number): string {
  return i18n.public.issueFormat.number(positionFromOldest);
}

type IssueOrderItem = { id: string; publishedAt: string };

function sortIssuesOldestFirst<T extends IssueOrderItem>(issues: T[]): T[] {
  return [...issues].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
  );
}

// Oldest-first index of a single issue (0 when not found).
export function getIssueOrderIndex(issues: IssueOrderItem[], issueId: string): number {
  const index = sortIssuesOldestFirst(issues).findIndex((issue) => issue.id === issueId);
  return index >= 0 ? index : 0;
}

// Map of issue id -> sequential issue number, ordered oldest-first.
export function buildIssueNumberMap(issues: IssueOrderItem[]): Map<string, string> {
  return new Map(
    sortIssuesOldestFirst(issues).map((issue, index) => [issue.id, formatIssueNumber(index)]),
  );
}

export function formatIssueMonthYearLong(publishedAt: string): string {
  const date = new Date(publishedAt);
  const formatter = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });

  return formatter.format(date);
}

export function formatIssueSeasonShort(publishedAt: string): string {
  const date = new Date(publishedAt);
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();
  return `${monthsShort[month]} ${year}`;
}

export function formatIssueSeasonLong(publishedAt: string): string {
  const date = new Date(publishedAt);
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  const seasonKey = resolveSeasonKey(month);
  return `${seasons[seasonKey]} ${year}`;
}

export function resolveSeasonKey(month: number): keyof typeof seasons {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}
