import { z } from "zod";

export const chartKindSchema = z.enum([
  "pie",
  "bar",
  "discreteBar",
  "histogram",
  "frequencyArea",
  "temporalBar",
  "table",
]);

/**
 * Minimum number of valid responses a field needs before a chart is the default view.
 * Below it the selection falls back to the data table: a chart of a handful of answers
 * suggests a distribution that the data cannot support.
 */
export const MIN_CHART_SAMPLE_SIZE = 5;

export const visualizationRationaleSchema = z.enum([
  "binaryNominal",
  "singleNominal",
  "multipleNominal",
  "ordinalDiscrete",
  "integerDiscrete",
  "numericDistribution",
  "temporalDistribution",
  "emptyData",
]);

export const visualizationMethodologySchema = z.enum([
  "binary_percentage",
  "category_percentage",
  "respondent_percentage",
  "ordinal_distribution",
  "numeric_distribution",
  "temporal_distribution",
  "no_data",
]);

export const publicVisualizationSchema = z.object({
  chart: chartKindSchema,
  alternatives: z.array(chartKindSchema),
  rationale: visualizationRationaleSchema,
  methodology: visualizationMethodologySchema,
});

export type ChartKind = z.infer<typeof chartKindSchema>;
export type VisualizationRationale = z.infer<typeof visualizationRationaleSchema>;
export type VisualizationMethodology = z.infer<typeof visualizationMethodologySchema>;
export type PublicVisualization = z.infer<typeof publicVisualizationSchema>;
