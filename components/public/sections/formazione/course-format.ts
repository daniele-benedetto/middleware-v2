export function formatCourseDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(new Date(value));
}

export function formatLessonNumber(value: number) {
  return String(value).padStart(2, "0");
}
