"use client";

import { useDeferredValue, useEffect, useEffectEvent, useRef, useState } from "react";

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
  const valueRef = useRef(value);
  const pendingSearchValue = useRef<string | null>(null);
  const emitSearchChange = useEffectEvent(onSearchChange);

  useEffect(() => {
    if (initialValue === valueRef.current) {
      pendingSearchValue.current = null;
      return;
    }

    if (initialValue === pendingSearchValue.current) {
      pendingSearchValue.current = null;
      return;
    }

    valueRef.current = initialValue;
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (deferredValue !== initialValue) {
        pendingSearchValue.current = deferredValue;
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
      onChange={(event) => {
        valueRef.current = event.target.value;
        setValue(event.target.value);
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}
