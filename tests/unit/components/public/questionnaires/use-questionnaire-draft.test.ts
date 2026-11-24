import { describe, expect, it } from "vitest";

import {
  isQuestionnaireDraftExpired,
  QUESTIONNAIRE_DRAFT_MAX_AGE_DAYS,
  toRestoredDraft,
} from "@/components/public/questionnaires/use-questionnaire-draft";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 24);
const answers = { question: "risposta" };

describe("questionnaire draft expiry", () => {
  it("restores a recent draft", () => {
    const stored = { version: 1, answers, stepIndex: 2, savedAt: now - day };

    expect(isQuestionnaireDraftExpired(stored, now)).toBe(false);
    expect(toRestoredDraft(stored, 1, now)).toEqual({ answers, stepIndex: 2 });
  });

  it("drops a draft older than the maximum age", () => {
    const stored = {
      version: 1,
      answers,
      savedAt: now - (QUESTIONNAIRE_DRAFT_MAX_AGE_DAYS + 1) * day,
    };

    expect(isQuestionnaireDraftExpired(stored, now)).toBe(true);
    expect(toRestoredDraft(stored, 1, now)).toBeNull();
  });

  it("keeps drafts written before drafts could expire", () => {
    const stored = { version: 1, answers };

    expect(isQuestionnaireDraftExpired(stored, now)).toBe(false);
    expect(toRestoredDraft(stored, 1, now)).toEqual({ answers });
  });

  it("ignores drafts of another definition version", () => {
    expect(toRestoredDraft({ version: 2, answers, savedAt: now }, 1, now)).toBeNull();
  });
});
