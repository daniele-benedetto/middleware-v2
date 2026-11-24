export function formatQuestionNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function getAnalysisFieldAnchorId(fieldId: string) {
  return `questionnaire-field-${fieldId}`;
}
