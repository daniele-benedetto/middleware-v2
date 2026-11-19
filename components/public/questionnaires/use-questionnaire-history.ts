"use client";

import { useEffect, useEffectEvent } from "react";

import type { QuestionnaireFlowStop } from "@/lib/questionnaires/flow";

export type QuestionnaireHistoryStop = "intro" | QuestionnaireFlowStop;

/**
 * What a browser history entry remembers about the questionnaire. It lives in `history.state`
 * (the URL never changes and never carries answers):
 * - `previousStop`: stop of the entry right before this one, to know when "back" can be a real
 *   history traversal;
 * - `depth`: how many questionnaire entries precede this one, to leave them all at the end.
 */
export type QuestionnaireHistoryEntry = {
  stop: QuestionnaireHistoryStop;
  editing: boolean;
  previousStop: QuestionnaireHistoryStop | null;
  depth: number;
};

const stateKey = "questionnaireFlow";

function isStop(value: unknown): value is QuestionnaireHistoryStop {
  return (
    value === "intro" ||
    value === "review" ||
    (typeof value === "number" && Number.isInteger(value) && value >= 0)
  );
}

function readEntry(state: unknown): QuestionnaireHistoryEntry | null {
  if (typeof state !== "object" || state === null || !(stateKey in state)) return null;
  const stored = state[stateKey];
  if (typeof stored !== "object" || stored === null) return null;
  const { stop, editing, previousStop, depth } = stored as Record<string, unknown>;
  if (!isStop(stop)) return null;

  return {
    stop,
    editing: editing === true,
    previousStop: isStop(previousStop) ? previousStop : null,
    depth: typeof depth === "number" && Number.isInteger(depth) && depth >= 0 ? depth : 0,
  };
}

function currentEntry() {
  return readEntry(window.history.state);
}

/**
 * The existing state is kept: it holds what the App Router needs to handle `popstate` on the
 * entry (Next.js supports native `pushState`/`replaceState` calls, see "Native History API").
 */
function writeEntry(method: "pushState" | "replaceState", entry: QuestionnaireHistoryEntry) {
  window.history[method]({ ...window.history.state, [stateKey]: entry }, "");
}

export const questionnaireHistory = {
  /** Adds an entry for `stop` after the current one. */
  push(stop: QuestionnaireHistoryStop, editing = false) {
    const current = currentEntry();
    writeEntry("pushState", {
      stop,
      editing,
      previousStop: current?.stop ?? null,
      depth: (current?.depth ?? 0) + 1,
    });
  },
  /** Rewrites the current entry in place (its position in the history does not change). */
  replace(stop: QuestionnaireHistoryStop, editing = false) {
    const current = currentEntry();
    writeEntry("replaceState", {
      stop,
      editing,
      previousStop: current?.previousStop ?? null,
      depth: current?.depth ?? 0,
    });
  },
  /** True when the browser "back" button would land on `stop`. */
  isPrevious(stop: QuestionnaireHistoryStop) {
    const current = currentEntry();
    return current !== null && current.depth > 0 && current.previousStop === stop;
  },
  back() {
    window.history.back();
  },
  /** Goes back to the first questionnaire entry, so the next "back" leaves the questionnaire. */
  unwind() {
    const depth = currentEntry()?.depth ?? 0;
    if (depth > 0) window.history.go(-depth);
  },
};

/**
 * Calls `onTraverse` with the entry reached through the browser back/forward buttons
 * (`null` for an entry the questionnaire never wrote).
 * On mount the current entry becomes the intro: after a reload the page restarts from there and
 * the answers come back from the draft, whatever stop the entry was showing.
 */
export function useQuestionnaireHistoryTraversal(
  onTraverse: (entry: QuestionnaireHistoryEntry | null) => void,
) {
  const handleTraverse = useEffectEvent(onTraverse);

  useEffect(() => {
    questionnaireHistory.replace("intro");
    const onPopState = (event: PopStateEvent) => handleTraverse(readEntry(event.state));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
}
