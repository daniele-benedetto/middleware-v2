"use client";

import { useLayoutEffect, useRef, useState } from "react";

type AutoClampTextProps = {
  children: string;
  className?: string;
};

export function AutoClampText({ children, className = "" }: AutoClampTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [lineClamp, setLineClamp] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const updateLineClamp = () => {
      const styles = window.getComputedStyle(element);
      const lineHeight = Number.parseFloat(styles.lineHeight);

      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        setLineClamp(null);
        return;
      }

      const nextLineClamp = Math.max(1, Math.floor(element.clientHeight / lineHeight));
      setLineClamp((currentLineClamp) =>
        currentLineClamp === nextLineClamp ? currentLineClamp : nextLineClamp,
      );
    };

    updateLineClamp();

    const resizeObserver = new ResizeObserver(updateLineClamp);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <p
      ref={ref}
      className={`min-h-0 overflow-hidden ${className}`}
      style={
        lineClamp
          ? {
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: lineClamp,
            }
          : undefined
      }
    >
      {children}
    </p>
  );
}
