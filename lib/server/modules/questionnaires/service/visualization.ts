import { MIN_CHART_SAMPLE_SIZE } from "@/lib/server/modules/questionnaires/schema/visualization";

import type {
  ChartKind,
  PublicVisualization,
} from "@/lib/server/modules/questionnaires/schema/visualization";

type AnalysisFieldInput = {
  kind: "boolean" | "choice" | "number" | "date";
  responseCount: number;
  multiple?: boolean;
  numericType?: "scale" | "integer" | "decimal";
  integerVisualization?: "discrete" | "histogram";
  discrete?: boolean;
  distribution?: readonly unknown[];
  [key: string]: unknown;
};

function emptyVisualization(): PublicVisualization {
  return {
    chart: "table",
    alternatives: [],
    rationale: "emptyData",
    methodology: "no_data",
  };
}

/**
 * Numeric chart by measurement level:
 * - scale: one bar per scale value (ordinal, every step is shown);
 * - binned values (decimals, integers configured as histogram): histogram, but only when
 *   there is more than one bin — a single bin is one full-height bar that says nothing;
 * - discrete integers: frequency polygon over the observed values.
 */
function selectNumberChart(field: AnalysisFieldInput): ChartKind {
  if (field.numericType === "scale") return "discreteBar";

  const binned =
    field.numericType === "decimal" ||
    (field.numericType === "integer" && field.integerVisualization === "histogram");
  if (!binned) return "frequencyArea";

  const singleBin = field.distribution !== undefined && field.distribution.length < 2;
  return singleBin ? "table" : "histogram";
}

function selectDefaultVisualization(field: AnalysisFieldInput): PublicVisualization {
  if (field.kind === "boolean") {
    return {
      chart: "pie",
      alternatives: ["bar"],
      rationale: "binaryNominal",
      methodology: "binary_percentage",
    };
  }

  if (field.kind === "choice") {
    return {
      chart: "bar",
      alternatives: ["table"],
      rationale: field.multiple ? "multipleNominal" : "singleNominal",
      methodology: field.multiple ? "respondent_percentage" : "category_percentage",
    };
  }

  if (field.kind === "number") {
    const chart = selectNumberChart(field);
    return {
      chart,
      alternatives: chart === "table" ? ["histogram"] : ["table"],
      rationale:
        field.numericType === "scale"
          ? "ordinalDiscrete"
          : field.numericType === "integer" && field.integerVisualization !== "histogram"
            ? "integerDiscrete"
            : "numericDistribution",
      methodology: field.numericType === "scale" ? "ordinal_distribution" : "numeric_distribution",
    };
  }

  return {
    chart: "temporalBar",
    alternatives: ["table"],
    rationale: "temporalDistribution",
    methodology: "temporal_distribution",
  };
}

/** Below the minimum sample the table leads and the usual charts become alternatives. */
function preferTable(visualization: PublicVisualization): PublicVisualization {
  const charts = [visualization.chart, ...visualization.alternatives].filter(
    (chart) => chart !== "table",
  );
  return { ...visualization, chart: "table", alternatives: [...new Set(charts)] };
}

export function selectQuestionnaireFieldVisualization(
  field: AnalysisFieldInput,
): PublicVisualization {
  if (field.responseCount === 0) return emptyVisualization();

  const visualization = selectDefaultVisualization(field);
  return field.responseCount < MIN_CHART_SAMPLE_SIZE ? preferTable(visualization) : visualization;
}
