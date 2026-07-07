"use client";

import { useEffect, useState } from "react";

import {
  getLivePreviewChannel,
  getLivePreviewStorageKey,
  type ArticleLivePreviewMessage,
  type ArticleLivePreviewSnapshot,
  type CourseLivePreviewMessage,
  type CourseLivePreviewSnapshot,
  type IssueLivePreviewMessage,
  type IssueLivePreviewSnapshot,
  type LessonLivePreviewMessage,
  type LessonLivePreviewSnapshot,
  type LivePreviewMessage,
} from "@/lib/cms/preview/live";

type LivePreviewResource = "article" | "issue" | "course" | "lesson";

function readStoredSnapshot<TSnapshot>(resource: LivePreviewResource, sessionId: string) {
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
  resource: LivePreviewResource,
  sessionId: string,
  snapshot: TSnapshot,
) {
  window.sessionStorage.setItem(
    getLivePreviewStorageKey(resource, sessionId),
    JSON.stringify(snapshot),
  );
}

function getMessageResource(message: LivePreviewMessage): LivePreviewResource {
  switch (message.type) {
    case "article-preview":
      return "article";
    case "issue-preview":
      return "issue";
    case "course-preview":
      return "course";
    case "lesson-preview":
      return "lesson";
  }
}

export function publishLivePreviewMessage(sessionId: string, message: LivePreviewMessage) {
  if (typeof window === "undefined") return;

  const resource = getMessageResource(message);
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

export function useCourseLivePreviewSnapshot(
  sessionId: string,
  initialSnapshot: CourseLivePreviewSnapshot,
) {
  const [snapshot, setSnapshot] = useState<CourseLivePreviewSnapshot>(() => {
    return readStoredSnapshot<CourseLivePreviewSnapshot>("course", sessionId) ?? initialSnapshot;
  });
  const [isLive, setIsLive] = useState(() => {
    return Boolean(readStoredSnapshot<CourseLivePreviewSnapshot>("course", sessionId));
  });

  useEffect(() => {
    const channel = new BroadcastChannel(getLivePreviewChannel("course", sessionId));
    channel.onmessage = (event: MessageEvent<CourseLivePreviewMessage>) => {
      if (event.data.type !== "course-preview") return;
      setSnapshot(event.data.snapshot);
      setIsLive(true);
      writeStoredSnapshot("course", sessionId, event.data.snapshot);
    };

    return () => channel.close();
  }, [sessionId]);

  return { snapshot, isLive };
}

export function useLessonLivePreviewSnapshot(
  sessionId: string,
  initialSnapshot: LessonLivePreviewSnapshot,
) {
  const [snapshot, setSnapshot] = useState<LessonLivePreviewSnapshot>(() => {
    return readStoredSnapshot<LessonLivePreviewSnapshot>("lesson", sessionId) ?? initialSnapshot;
  });
  const [isLive, setIsLive] = useState(() => {
    return Boolean(readStoredSnapshot<LessonLivePreviewSnapshot>("lesson", sessionId));
  });

  useEffect(() => {
    const channel = new BroadcastChannel(getLivePreviewChannel("lesson", sessionId));
    channel.onmessage = (event: MessageEvent<LessonLivePreviewMessage>) => {
      if (event.data.type !== "lesson-preview") return;
      setSnapshot(event.data.snapshot);
      setIsLive(true);
      writeStoredSnapshot("lesson", sessionId, event.data.snapshot);
    };

    return () => channel.close();
  }, [sessionId]);

  return { snapshot, isLive };
}
