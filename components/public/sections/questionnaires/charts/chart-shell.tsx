"use client";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export function ChartShell({
  config,
  children,
  className,
}: {
  config: ChartConfig;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ChartContainer config={config} className={cn("h-70 min-h-70 w-full", className)}>
      {children}
    </ChartContainer>
  );
}
