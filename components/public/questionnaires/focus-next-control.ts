const NON_TEXT_INPUT_TYPES = ["radio", "checkbox", "button", "submit", "reset", "range", "file"];

const ENTER_TARGETS_SELECTOR =
  "input:not([disabled]), textarea:not([disabled]), button[type='submit']:not([disabled])";

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
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(ENTER_TARGETS_SELECTOR)];
  const next = controls[controls.indexOf(target) + 1];
  if (next) next.focus();
  else target.blur();
  return true;
}
