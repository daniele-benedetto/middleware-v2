const closedDateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Rome",
});

export function formatAnalysisClosedDate(closedAt: string) {
  return closedDateFormatter.format(new Date(closedAt));
}

export function formatQuestionNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

/** Stable DOM id of the visible result heading of a field, usable as a deep-link anchor. */
export function getAnalysisFieldAnchorId(fieldId: string) {
  return `questionnaire-field-${fieldId}`;
}

/** Public URL of the results page of a closed questionnaire. */
export function getQuestionnaireResultsPath(slug: string) {
  return `/questionari/${slug}/risultati`;
}
