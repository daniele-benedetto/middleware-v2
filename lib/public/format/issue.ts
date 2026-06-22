const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const seasons = {
  spring: "Primavera",
  summer: "Estate",
  autumn: "Autunno",
  winter: "Inverno",
} as const;

export function formatIssueNumber(positionFromOldest: number): string {
  return `N. ${String(positionFromOldest).padStart(2, "0")}`;
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
  return `${months[month]} ${year}`;
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
