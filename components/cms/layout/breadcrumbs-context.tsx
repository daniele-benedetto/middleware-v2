"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { ReactNode } from "react";

type CmsBreadcrumbsContextValue = {
  label: string | null;
  setLabel: (label: string | null) => void;
};

const CmsBreadcrumbsContext = createContext<CmsBreadcrumbsContextValue | null>(null);

export function CmsBreadcrumbsProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const value = useMemo(() => ({ label, setLabel }), [label]);

  return <CmsBreadcrumbsContext.Provider value={value}>{children}</CmsBreadcrumbsContext.Provider>;
}

function useCmsBreadcrumbsContext() {
  const ctx = useContext(CmsBreadcrumbsContext);
  if (!ctx) {
    throw new Error("CmsBreadcrumbsProvider missing");
  }
  return ctx;
}

export function useCmsBreadcrumbLabel(): string | null {
  return useCmsBreadcrumbsContext().label;
}

export function useSetCmsBreadcrumbLabel(label: string | null | undefined): void {
  const { setLabel } = useCmsBreadcrumbsContext();

  useEffect(() => {
    setLabel(label ?? null);
    return () => {
      setLabel(null);
    };
  }, [label, setLabel]);
}
