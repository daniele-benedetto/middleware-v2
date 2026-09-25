import { i18n } from "@/lib/i18n";

import type { PublicVisualization } from "@/lib/server/modules/questionnaires/schema";

const methodologyLabels: Record<PublicVisualization["methodology"], string> = {
  binary_percentage: i18n.public.questionnaireAnalysis.methodBinaryPercentage,
  category_percentage: i18n.public.questionnaireAnalysis.methodCategoryPercentage,
  respondent_percentage: i18n.public.questionnaireAnalysis.methodRespondentPercentage,
  ordinal_distribution: i18n.public.questionnaireAnalysis.methodOrdinalDistribution,
  numeric_distribution: i18n.public.questionnaireAnalysis.methodNumericDistribution,
  temporal_distribution: i18n.public.questionnaireAnalysis.methodTemporalDistribution,
  no_data: i18n.public.questionnaireAnalysis.methodNoData,
};

export function ChartMethodology({ methodology }: { methodology: PublicVisualization }) {
  return (
    <p className="mt-3 font-editorial text-sm leading-[1.45] text-muted">
      {methodologyLabels[methodology.methodology]}
    </p>
  );
}
