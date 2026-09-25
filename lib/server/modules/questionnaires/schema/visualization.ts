import { z } from "zod";

export const chartKindSchema = z.enum([
  "pie",
  "bar",
  "discreteBar",
  "histogram",
  "temporalBar",
  "dotPlot",
  "table",
]);

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
