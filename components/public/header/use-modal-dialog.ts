"use client";

import { type RefObject, useEffect, useEffectEvent } from "react";

const backgroundSelector = "[data-public-header], [data-public-page-content], [data-public-footer]";
const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

type UseModalDialogOptions = {
  open: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
};

function trapTabFocus(event: KeyboardEvent, dialog: HTMLElement) {
  const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
  const firstElement = focusableElements[0];
  const lastElement = focusableElements.at(-1);

  if (!firstElement || !lastElement) {
    event.preventDefault();
    return;
  }

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

export function useModalDialog({
  open,
  dialogRef,
  returnFocusRef,
  onClose,
}: UseModalDialogOptions) {
  const closeDialog = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const returnFocusTarget = returnFocusRef.current;
    const backgroundElements = Array.from(
      document.querySelectorAll<HTMLElement>(backgroundSelector),
    );
    const previousOverflow = document.body.style.overflow;

    backgroundElements.forEach((element) => {
      element.inert = true;
    });
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key === "Tab" && dialog) trapTabFocus(event, dialog);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      backgroundElements.forEach((element) => {
        element.inert = false;
      });
      document.body.style.overflow = previousOverflow;
      returnFocusTarget?.focus({ preventScroll: true });
    };
  }, [open, dialogRef, returnFocusRef]);
}
