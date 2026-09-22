import "server-only";

import { parseAudioChunks, type AudioChunk } from "@/lib/audio/audio-chunks";
import { extractCmsMediaPathname } from "@/lib/media/blob";
import { mediaStorage } from "@/lib/server/storage/media-storage";

const maxAudioChunksBytes = 5 * 1024 * 1024;

async function readStreamAsText(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxAudioChunksBytes) return null;
      chunks.push(decoder.decode(value, { stream: true }));
    }

    chunks.push(decoder.decode());
    return chunks.join("");
  } finally {
    reader.releaseLock();
  }
}

async function loadJsonFromMedia(value: string) {
  const pathname = extractCmsMediaPathname(value);
  if (!pathname) return null;

  const result = await mediaStorage.get(pathname);
  if (result.contentType !== "application/json" || result.size > maxAudioChunksBytes) {
    return null;
  }

  const json = await readStreamAsText(result.stream);
  return json ? JSON.parse(json) : null;
}

export async function loadPublicAudioChunks(value: unknown): Promise<AudioChunk[]> {
  if (typeof value !== "string" || !value.trim()) {
    return parseAudioChunks(value);
  }

  try {
    return parseAudioChunks(await loadJsonFromMedia(value));
  } catch {
    return [];
  }
}
