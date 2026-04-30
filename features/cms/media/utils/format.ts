export function formatMediaSize(bytes: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "unit",
    unit: bytes >= 1024 * 1024 ? "megabyte" : "kilobyte",
    maximumFractionDigits: 1,
  }).format(bytes >= 1024 * 1024 ? bytes / (1024 * 1024) : Math.max(bytes / 1024, 0.1));
}

export function formatMediaDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
