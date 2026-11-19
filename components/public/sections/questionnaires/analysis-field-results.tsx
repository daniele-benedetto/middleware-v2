"use client";

import { useState } from "react";

import { AnalysisFieldHeader } from "./analysis-field-header";
import { AnalysisFieldRenderer } from "./charts/analysis-field-renderer";
import { AnalysisViewToggle } from "./charts/analysis-view-toggle";
import {
  getAnalysisViews,
  resolveAnalysisView,
  type AnalysisField,
  type AnalysisView,
} from "./charts/analysis-views";

/** Results of one question: heading with sample base, view toggle and chart/table. */
export function AnalysisFieldResults({
  field,
  index,
  total,
}: {
  field: AnalysisField;
  index: number;
  total: number;
}) {
  const [requestedView, setRequestedView] = useState<AnalysisView>();
  const views = getAnalysisViews(field);
  const activeView = resolveAnalysisView(field, requestedView);

  return (
    <div className="grid gap-6">
      <AnalysisFieldHeader field={field} index={index} total={total} />
      {field.responseCount > 0 ? (
        <div className="flex justify-end">
          <AnalysisViewToggle views={views} activeView={activeView} onChange={setRequestedView} />
        </div>
      ) : null}
      <AnalysisFieldRenderer field={field} view={activeView} />
    </div>
  );
}
