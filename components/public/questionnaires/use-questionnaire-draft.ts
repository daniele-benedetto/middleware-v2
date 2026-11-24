"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RestoredDraft = { answers: Record<string, unknown>; stepIndex?: number };
type StoredDraft = {
  version: number;
  answers: Record<string, unknown>;
  stepIndex?: number;
  /** Epoch ms of the last write; missing on drafts written before drafts could expire. */
  savedAt?: number;
};

const databaseName = "middleware-questionnaire-drafts";
const storeName = "drafts";
/** Answers (possibly personal data) are kept on the device for at most this long. */
export const QUESTIONNAIRE_DRAFT_MAX_AGE_DAYS = 30;
const draftMaxAgeMs = QUESTIONNAIRE_DRAFT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readDraft(key: string) {
  const database = await openDatabase();
  return new Promise<unknown>((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

async function writeDraft(key: string, draft: StoredDraft) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(draft, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }).finally(() => database.close());
}

async function deleteDraft(key: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }).finally(() => database.close());
}

/** True when the draft was last saved longer ago than the allowed age. */
export function isQuestionnaireDraftExpired(stored: unknown, now: number): boolean {
  if (!stored || typeof stored !== "object") return false;
  const { savedAt } = stored as Partial<StoredDraft>;
  return typeof savedAt === "number" && now - savedAt > draftMaxAgeMs;
}

/**
 * Accepts drafts written by the previous formats too (no `stepIndex`, no `savedAt`); drops
 * expired ones.
 */
export function toRestoredDraft(
  stored: unknown,
  version: number,
  now: number,
): RestoredDraft | null {
  if (!stored || typeof stored !== "object") return null;
  if (isQuestionnaireDraftExpired(stored, now)) return null;
  const { version: storedVersion, answers, stepIndex } = stored as Partial<StoredDraft>;
  if (storedVersion !== version) return null;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return null;
  if (Object.keys(answers).length === 0) return null;

  return typeof stepIndex === "number" && Number.isInteger(stepIndex) && stepIndex >= 0
    ? { answers, stepIndex }
    : { answers };
}

export function useQuestionnaireDraft(questionnaireId: string, version: number) {
  const key = `${questionnaireId}:v${version}`;
  const hydrated = useRef(false);
  // Storage operations run one at a time, in call order, so a delete always lands after any
  // write that was already in flight.
  const queue = useRef<Promise<void>>(Promise.resolve());
  // Bumped by `clear()`: writes requested before it are dropped instead of resurrecting the draft.
  const generation = useRef(0);
  const latestWrite = useRef(0);
  const [restoredDraft, setRestoredDraft] = useState<RestoredDraft | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hydrated.current = false;

    const finish = (draft: RestoredDraft | null) => {
      if (cancelled) return;
      hydrated.current = true;
      setRestoredDraft(draft);
      setIsHydrated(true);
    };

    if (!window.indexedDB) {
      void Promise.resolve().then(() => finish(null));
    } else {
      const readGeneration = generation.current;
      void readDraft(key)
        .then((stored) => {
          // An expired draft is not just ignored: its answers are removed from the device.
          if (isQuestionnaireDraftExpired(stored, Date.now())) {
            void deleteDraft(key).catch(() => undefined);
          }
          // A `clear()` issued while reading wins over whatever was stored.
          finish(
            readGeneration === generation.current
              ? toRestoredDraft(stored, version, Date.now())
              : null,
          );
        })
        .catch(() => finish(null));
    }

    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const enqueue = useCallback((operation: () => Promise<void>) => {
    const run = queue.current.then(operation);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  const persist = useCallback(
    (answers: Record<string, unknown>, stepIndex: number) => {
      if (!hydrated.current || !window.indexedDB) return;
      const writeGeneration = generation.current;
      const writeId = ++latestWrite.current;
      const isCurrent = () =>
        writeGeneration === generation.current && writeId === latestWrite.current;

      void enqueue(async () => {
        // Superseded by a newer write or by `clear()`: nothing to store.
        if (!isCurrent()) return;
        await writeDraft(key, { version, answers, stepIndex, savedAt: Date.now() });
      }).catch(() => undefined);
    },
    [enqueue, key, version],
  );

  const clear = useCallback(() => {
    generation.current += 1;
    setRestoredDraft(null);
    if (!window.indexedDB) return;
    void enqueue(() => deleteDraft(key)).catch(() => undefined);
  }, [enqueue, key]);

  return { restoredDraft, isHydrated, persist, clear };
}
