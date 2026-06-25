import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type AudioProgressStatus = "listening" | "paused" | "completed";

export type AudioProgressRecord = {
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  articleUpdatedAt: string | null;
  audioUrl: string;
  currentTime: number;
  duration: number | null;
  status: AudioProgressStatus;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type AudioBookmarkRecord = {
  id: string;
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  articleUpdatedAt: string | null;
  audioUrl: string;
  chunkId: string;
  chunkStart: number;
  chunkEnd: number;
  chunkText: string;
  createdAt: string;
};

type MiddlewareClientDb = DBSchema & {
  audioProgress: {
    key: string;
    value: AudioProgressRecord;
    indexes: {
      "by-updatedAt": string;
      "by-status": AudioProgressStatus;
    };
  };
  audioBookmarks: {
    key: string;
    value: AudioBookmarkRecord;
    indexes: {
      "by-articleId": string;
      "by-createdAt": string;
    };
  };
};

const databaseName = "middleware-client";
const databaseVersion = 2;
const audioProgressStoreName = "audioProgress";
const audioBookmarksStoreName = "audioBookmarks";
const maxStoredAudioProgressRecords = 200;
const audioProgressRetentionMs = 1000 * 60 * 60 * 24 * 180;

let databasePromise: Promise<IDBPDatabase<MiddlewareClientDb>> | null = null;

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function getDatabase() {
  if (!canUseIndexedDb()) {
    return null;
  }

  databasePromise ??= openDB<MiddlewareClientDb>(databaseName, databaseVersion, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(audioProgressStoreName)) {
        const store = database.createObjectStore(audioProgressStoreName, { keyPath: "articleId" });
        store.createIndex("by-updatedAt", "updatedAt");
        store.createIndex("by-status", "status");
      }

      if (!database.objectStoreNames.contains(audioBookmarksStoreName)) {
        const store = database.createObjectStore(audioBookmarksStoreName, { keyPath: "id" });
        store.createIndex("by-articleId", "articleId");
        store.createIndex("by-createdAt", "createdAt");
      }
    },
  });

  return databasePromise;
}

async function runAudioProgressOperation<T>(
  operation: (database: IDBPDatabase<MiddlewareClientDb>) => Promise<T>,
) {
  try {
    const database = getDatabase();
    if (!database) return null;
    return await operation(await database);
  } catch {
    return null;
  }
}

export async function getAudioProgress(articleId: string) {
  return runAudioProgressOperation((database) => database.get(audioProgressStoreName, articleId));
}

export async function saveAudioProgress(record: AudioProgressRecord) {
  return runAudioProgressOperation(async (database) => {
    await database.put(audioProgressStoreName, record);
    await cleanupAudioProgress();
    return record;
  });
}

export async function deleteAudioProgress(articleId: string) {
  return runAudioProgressOperation((database) =>
    database.delete(audioProgressStoreName, articleId),
  );
}

export async function cleanupAudioProgress() {
  return runAudioProgressOperation(async (database) => {
    const records = await database.getAll(audioProgressStoreName);
    const now = Date.now();
    const expiredRecords = records.filter(
      (record) => now - new Date(record.updatedAt).getTime() > audioProgressRetentionMs,
    );
    const overflowRecords = records
      .filter((record) => !expiredRecords.some((expired) => expired.articleId === record.articleId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(maxStoredAudioProgressRecords);

    await Promise.all(
      [...expiredRecords, ...overflowRecords].map((record) =>
        database.delete(audioProgressStoreName, record.articleId),
      ),
    );
  });
}

export function getAudioBookmarkId(articleId: string, chunkId: string) {
  return `${articleId}:${chunkId}`;
}

export async function getAudioBookmarks(articleId: string) {
  return runAudioProgressOperation((database) =>
    database.getAllFromIndex(audioBookmarksStoreName, "by-articleId", articleId),
  );
}

export async function saveAudioBookmark(record: AudioBookmarkRecord) {
  return runAudioProgressOperation(async (database) => {
    await database.put(audioBookmarksStoreName, record);
    return record;
  });
}

export async function deleteAudioBookmark(articleId: string, chunkId: string) {
  return runAudioProgressOperation((database) =>
    database.delete(audioBookmarksStoreName, getAudioBookmarkId(articleId, chunkId)),
  );
}
