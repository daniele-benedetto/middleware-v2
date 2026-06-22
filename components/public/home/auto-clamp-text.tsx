"use client";

import { useLayoutEffect, useRef, useState } from "react";

type AutoClampTextProps = {
  children: string;
  className?: string;
};

export function AutoClampText({ children, className = "" }: AutoClampTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [text, setText] = useState(children);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const updateText = () => {
      const availableHeight = element.clientHeight;

      if (availableHeight <= 0) {
        setText(children);
        return;
      }

      element.textContent = children;

      if (element.scrollHeight <= availableHeight + 1) {
        setText(children);
        return;
      }

      let low = 0;
      let high = children.length;
      let nextText = "...";

      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const candidate = `${children.slice(0, middle).trimEnd()}...`;

        element.textContent = candidate;

        if (element.scrollHeight <= availableHeight + 1) {
          nextText = candidate;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }

      setText((currentText) => (currentText === nextText ? currentText : nextText));
    };

    updateText();

    const resizeObserver = new ResizeObserver(updateText);
    resizeObserver.observe(element);

    void document.fonts?.ready.then(updateText);

    return () => resizeObserver.disconnect();
  }, [children]);

  return (
    <p ref={ref} className={`min-h-0 overflow-hidden ${className}`}>
      {text}
    </p>
  );
}
