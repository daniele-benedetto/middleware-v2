"use client";

import { useEffect, useState } from "react";

import {
  getLivePreviewChannel,
  getLivePreviewStorageKey,
  type ArticleLivePreviewMessage,
  type ArticleLivePreviewSnapshot,
  type IssueLivePreviewMessage,
  type IssueLivePreviewSnapshot,
  type LivePreviewMessage,
} from "@/lib/cms/preview/live";

function readStoredSnapshot<TSnapshot>(resource: "article" | "issue", sessionId: string) {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(getLivePreviewStorageKey(resource, sessionId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as TSnapshot;
  } catch {
    return null;
  }
}

function writeStoredSnapshot<TSnapshot>(
  resource: "article" | "issue",
  sessionId: string,
  snapshot: TSnapshot,
) {
  window.sessionStorage.setItem(
    getLivePreviewStorageKey(resource, sessionId),
    JSON.stringify(snapshot),
  );
}

export function publishLivePreviewMessage(sessionId: string, message: LivePreviewMessage) {
  if (typeof window === "undefined") return;

  const resource = message.type === "article-preview" ? "article" : "issue";
  writeStoredSnapshot(resource, sessionId, message.snapshot);

  const channel = new BroadcastChannel(getLivePreviewChannel(resource, sessionId));
  channel.postMessage(message);
  channel.close();
}

export function useArticleLivePreviewSnapshot(
  sessionId: string,
  initialSnapshot: ArticleLivePreviewSnapshot,
) {
  const [snapshot, setSnapshot] = useState<ArticleLivePreviewSnapshot>(() => {
    return readStoredSnapshot<ArticleLivePreviewSnapshot>("article", sessionId) ?? initialSnapshot;
  });
  const [isLive, setIsLive] = useState(() => {
    return Boolean(readStoredSnapshot<ArticleLivePreviewSnapshot>("article", sessionId));
  });

  useEffect(() => {
    const channel = new BroadcastChannel(getLivePreviewChannel("article", sessionId));
    channel.onmessage = (event: MessageEvent<ArticleLivePreviewMessage>) => {
      if (event.data.type !== "article-preview") return;
      setSnapshot(event.data.snapshot);
      setIsLive(true);
      writeStoredSnapshot("article", sessionId, event.data.snapshot);
    };

    return () => channel.close();
  }, [sessionId]);

  return { snapshot, isLive };
}

export function useIssueLivePreviewSnapshot(
  sessionId: string,
  initialSnapshot: IssueLivePreviewSnapshot,
) {
  const [snapshot, setSnapshot] = useState<IssueLivePreviewSnapshot>(() => {
    return readStoredSnapshot<IssueLivePreviewSnapshot>("issue", sessionId) ?? initialSnapshot;
  });
  const [isLive, setIsLive] = useState(() => {
    return Boolean(readStoredSnapshot<IssueLivePreviewSnapshot>("issue", sessionId));
  });

  useEffect(() => {
    const channel = new BroadcastChannel(getLivePreviewChannel("issue", sessionId));
    channel.onmessage = (event: MessageEvent<IssueLivePreviewMessage>) => {
      if (event.data.type !== "issue-preview") return;
      setSnapshot(event.data.snapshot);
      setIsLive(true);
      writeStoredSnapshot("issue", sessionId, event.data.snapshot);
    };

    return () => channel.close();
  }, [sessionId]);

  return { snapshot, isLive };
}
