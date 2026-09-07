"use client";

import { useEffect, useRef, useState } from "react";

type Draft = { version: number; answers: Record<string, unknown> };

const databaseName = "middleware-questionnaire-drafts";
const storeName = "drafts";

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
  return new Promise<Draft | undefined>((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result as Draft | undefined);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

async function writeDraft(key: string, draft: Draft) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const request = database
      .transaction(storeName, "readwrite")
      .objectStore(storeName)
      .put(draft, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

async function deleteDraft(key: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, "readwrite").objectStore(storeName).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

export function useQuestionnaireDraft(questionnaireId: string, version: number) {
  const key = `${questionnaireId}:v${version}`;
  const hydrated = useRef(false);
  const [restoredAnswers, setRestoredAnswers] = useState<Record<string, unknown> | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!window.indexedDB) {
      hydrated.current = true;
      void Promise.resolve().then(() => setIsHydrated(true));
      return;
    }
    void readDraft(key)
      .then((draft) => {
        if (draft?.version === version) setRestoredAnswers(draft.answers);
      })
      .catch(() => undefined)
      .finally(() => {
        hydrated.current = true;
        setIsHydrated(true);
      });
  }, [key, version]);

  const persist = (answers: Record<string, unknown>) => {
    if (!hydrated.current || !window.indexedDB) return;
    setStatus("saving");
    void writeDraft(key, { version, answers })
      .then(() => setStatus("saved"))
      .catch(() => setStatus("idle"));
  };
  const clear = () => {
    setRestoredAnswers(null);
    setStatus("idle");
    if (window.indexedDB) void deleteDraft(key).catch(() => undefined);
  };

  return { restoredAnswers, isHydrated, status, persist, clear };
}
