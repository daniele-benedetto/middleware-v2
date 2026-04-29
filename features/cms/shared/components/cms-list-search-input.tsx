"use client";

import { useDeferredValue, useEffect, useEffectEvent, useState } from "react";

import { CmsSearchBar } from "@/components/cms/primitives";

type CmsListSearchInputProps = {
  initialValue: string;
  placeholder: string;
  className?: string;
  debounceMs?: number;
  onSearchChange: (value: string) => void;
};

export function CmsListSearchInput({
  initialValue,
  placeholder,
  className,
  debounceMs = 300,
  onSearchChange,
}: CmsListSearchInputProps) {
  const [value, setValue] = useState(initialValue);
  const deferredValue = useDeferredValue(value);
  const emitSearchChange = useEffectEvent(onSearchChange);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (deferredValue !== initialValue) {
        emitSearchChange(deferredValue);
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [debounceMs, deferredValue, initialValue]);

  return (
    <CmsSearchBar
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
