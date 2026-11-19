"use client";

import { PercentageColumnChart } from "./percentage-column-chart";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type DateField = Extract<PublicQuestionnaireAnalysisDto["fields"][number], { kind: "date" }>;

function formatBucket(value: string, field: DateField) {
  const timeZone = field.temporalType === "date" ? "UTC" : "Europe/Rome";
  if (field.bucketUnit === "quarter") {
    const date = new Date(`${value}T00:00:00.000Z`);
    return `T${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
  }
  const options: Intl.DateTimeFormatOptions =
    field.bucketUnit === "year"
      ? { year: "numeric", timeZone }
      : field.bucketUnit === "month"
        ? { month: "long", year: "numeric", timeZone }
        : { day: "numeric", month: "short", year: "numeric", timeZone };
  return new Intl.DateTimeFormat("it-IT", options).format(new Date(`${value}T00:00:00.000Z`));
}

export function TemporalBarChart({ field }: { field: DateField }) {
  const data = field.distribution.map((bucket) => ({
    label: formatBucket(bucket.date, field),
    percentage: bucket.percentage,
    count: bucket.count,
  }));

  return <PercentageColumnChart ariaLabel="Distribuzione nel tempo" data={data} minTickGap={24} />;
}
