const NON_TEXT_INPUT_TYPES = ["radio", "checkbox", "button", "submit", "reset", "range", "file"];

/**
 * Enter in a single-line field moves to the next control instead of submitting the step: on a
 * phone the "go" key would otherwise jump ahead with half of the questions unanswered.
 * Returns true when the key was handled.
 */
export function focusNextControlOnEnter(event: {
  key: string;
  target: EventTarget | null;
  currentTarget: HTMLFormElement;
  preventDefault: () => void;
}): boolean {
  const { target } = event;
  if (
    event.key !== "Enter" ||
    !(target instanceof HTMLInputElement) ||
    NON_TEXT_INPUT_TYPES.includes(target.type)
  ) {
    return false;
  }
  event.preventDefault();
  const controls = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(
      "input:not([disabled]), textarea:not([disabled]), button:not([disabled])",
    ),
  ];
  const next = controls[controls.indexOf(target) + 1];
  if (next) next.focus();
  else target.blur();
  return true;
}
