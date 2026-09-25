import type { PublicVisualization } from "@/lib/server/modules/questionnaires/schema";

type AnalysisFieldInput = {
  kind: "boolean" | "choice" | "number" | "date";
  responseCount: number;
  multiple?: boolean;
  numericType?: "scale" | "integer" | "decimal";
  integerVisualization?: "discrete" | "histogram";
  [key: string]: unknown;
};

function alternatives(
  ...charts: PublicVisualization["alternatives"]
): PublicVisualization["alternatives"] {
  return [...new Set(charts)];
}

function emptyVisualization(): PublicVisualization {
  return {
    chart: "table",
    alternatives: [],
    rationale: "emptyData",
    methodology: "no_data",
  };
}

export function selectQuestionnaireFieldVisualization(
  field: AnalysisFieldInput,
): PublicVisualization {
  if (field.responseCount === 0) return emptyVisualization();

  if (field.kind === "boolean") {
    return {
      chart: "pie",
      alternatives: ["bar"],
      rationale: "binaryNominal",
      methodology: "binary_percentage",
    };
  }

  if (field.kind === "choice") {
    const smallSample = field.responseCount <= 4;
    const chart = smallSample ? "table" : "bar";
    return {
      chart,
      alternatives: smallSample ? ["bar"] : ["table"],
      rationale: field.multiple ? "multipleNominal" : "singleNominal",
      methodology: field.multiple ? "respondent_percentage" : "category_percentage",
    };
  }

  if (field.kind === "number") {
    const defaultChart =
      field.numericType === "integer" && field.integerVisualization === "discrete"
        ? "discreteBar"
        : field.numericType === "scale"
          ? "discreteBar"
          : "histogram";
    const smallSample = field.responseCount <= 4;
    return {
      chart: smallSample ? "dotPlot" : defaultChart,
      alternatives: smallSample ? alternatives(defaultChart, "table") : ["table"],
      rationale:
        field.numericType === "scale"
          ? "ordinalDiscrete"
          : field.numericType === "integer" && field.integerVisualization === "discrete"
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
