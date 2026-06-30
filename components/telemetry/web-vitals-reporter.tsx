"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";

import { reportWebVital } from "@/lib/telemetry/client";

type WebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

let currentPathname: string | null = null;

const reportMetric: WebVitalsCallback = (metric) => {
  reportWebVital(metric, currentPathname ?? undefined);
};

export function WebVitalsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    currentPathname = pathname;
  }, [pathname]);

  useReportWebVitals(reportMetric);

  return null;
}
