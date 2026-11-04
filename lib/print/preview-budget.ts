/** Reserve a meaningful continuation for the QR, without shortening a tiny article. */
export const MIN_PREVIEW_CONTINUATION_CHARS = 600;

export function initialPreviewBudget(length: number) {
  if (length < 2 * MIN_PREVIEW_CONTINUATION_CHARS) return length;
  return Math.min(Math.floor(length * 0.9), length - MIN_PREVIEW_CONTINUATION_CHARS);
}

export function canExpandPreview(length: number, budget: number) {
  return initialPreviewBudget(length) - budget >= MIN_PREVIEW_CONTINUATION_CHARS;
}
