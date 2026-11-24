"use client";

import { useEffect, useEffectEvent } from "react";

import type { QuestionnaireFlowStop } from "@/lib/questionnaires/flow";

export type QuestionnaireHistoryStop = "intro" | QuestionnaireFlowStop;

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

function writeEntry(method: "pushState" | "replaceState", entry: QuestionnaireHistoryEntry) {
  window.history[method]({ ...window.history.state, [stateKey]: entry }, "");
}

export const questionnaireHistory = {
  push(stop: QuestionnaireHistoryStop, editing = false) {
    const current = currentEntry();
    writeEntry("pushState", {
      stop,
      editing,
      previousStop: current?.stop ?? null,
      depth: (current?.depth ?? 0) + 1,
    });
  },
  replace(stop: QuestionnaireHistoryStop, editing = false) {
    const current = currentEntry();
    writeEntry("replaceState", {
      stop,
      editing,
      previousStop: current?.previousStop ?? null,
      depth: current?.depth ?? 0,
    });
  },
  isPrevious(stop: QuestionnaireHistoryStop) {
    const current = currentEntry();
    return current !== null && current.depth > 0 && current.previousStop === stop;
  },
  back() {
    window.history.back();
  },
  unwind() {
    const depth = currentEntry()?.depth ?? 0;
    if (depth > 0) window.history.go(-depth);
  },
};

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
