import { AnalysisFieldHeader } from "./analysis-field-header";
import { AnalysisTable } from "./analysis-table";

import type { AnalysisField } from "./analysis-field";

export function AnalysisFieldResults({ field }: { field: AnalysisField }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <AnalysisFieldHeader field={field} />
      <AnalysisTable field={field} scrollRows />
    </div>
  );
}
