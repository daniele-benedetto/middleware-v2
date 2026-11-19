"use client";

import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const QUESTIONNAIRE_RESULTS_TABS = ["sintesi", "risposte"] as const;
export type QuestionnaireResultsTab = (typeof QUESTIONNAIRE_RESULTS_TABS)[number];

export const questionnaireResultsTabPanelId = (tab: QuestionnaireResultsTab) =>
  `questionnaire-results-panel-${tab}`;
export const questionnaireResultsTabId = (tab: QuestionnaireResultsTab) =>
  `questionnaire-results-tab-${tab}`;

export function parseQuestionnaireResultsTab(value: string | null | undefined) {
  return QUESTIONNAIRE_RESULTS_TABS.find((tab) => tab === value) ?? "sintesi";
}

/**
 * Tab list of the results screen. Custom because no shadcn `Tabs` primitive is installed;
 * it follows the WAI-ARIA tabs pattern (roving tabindex, arrow keys).
 */
export function QuestionnaireResultsTabs({
  activeTab,
  onChange,
}: {
  activeTab: QuestionnaireResultsTab;
  onChange: (tab: QuestionnaireResultsTab) => void;
}) {
  const text = i18n.cms.lists.questionnaires.responses.tabs;
  const labels: Record<QuestionnaireResultsTab, string> = {
    sintesi: text.summary,
    risposte: text.responses,
  };

  const focusSibling = (current: QuestionnaireResultsTab, offset: number) => {
    const index = QUESTIONNAIRE_RESULTS_TABS.indexOf(current);
    const count = QUESTIONNAIRE_RESULTS_TABS.length;
    const next = QUESTIONNAIRE_RESULTS_TABS[(index + offset + count) % count];
    if (!next) return;
    onChange(next);
    document.getElementById(questionnaireResultsTabId(next))?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={text.ariaLabel}
      className="mb-5 flex shrink-0 gap-1 border-b border-foreground"
    >
      {QUESTIONNAIRE_RESULTS_TABS.map((tab) => {
        const selected = tab === activeTab;
        return (
          <button
            key={tab}
            id={questionnaireResultsTabId(tab)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={questionnaireResultsTabPanelId(tab)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") focusSibling(tab, 1);
              if (event.key === "ArrowLeft") focusSibling(tab, -1);
            }}
            className={cn(
              "-mb-px cursor-pointer rounded-t-[6px] border border-b-0 px-4 py-2 font-ui text-[11px] font-extrabold uppercase tracking-[.08em]",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-transparent text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {labels[tab]}
          </button>
        );
      })}
    </div>
  );
}
