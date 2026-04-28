"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (value !== initialValue) {
        onSearchChange(value);
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [debounceMs, initialValue, onSearchChange, value]);

  return (
    <CmsSearchBar
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
