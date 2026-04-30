import "server-only";

import { copy, del, head, list } from "@vercel/blob";

import { cmsMediaBlobAccess } from "@/lib/media/blob";

type MediaListRecord = Awaited<ReturnType<typeof list>>["blobs"][number];
type MediaHeadRecord = Awaited<ReturnType<typeof head>>;

const DEFAULT_LIST_LIMIT = 1_000;

function extractCacheControlMaxAge(cacheControl: string) {
  const match = cacheControl.match(/max-age=(\d+)/i);

  if (!match) {
    return undefined;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const mediaRepository = {
  async listAll() {
    const blobs: MediaListRecord[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const page = await list({
        cursor,
        limit: DEFAULT_LIST_LIMIT,
      });

      blobs.push(...page.blobs);
      cursor = page.cursor;
      hasMore = page.hasMore;
    }

    return blobs;
  },
  async head(urlOrPathname: string) {
    return head(urlOrPathname);
  },
  async rename(url: string, nextPathname: string, current?: MediaHeadRecord) {
    const source = current ?? (await head(url));

    const copied = await copy(url, nextPathname, {
      access: cmsMediaBlobAccess,
      contentType: source.contentType,
      cacheControlMaxAge: extractCacheControlMaxAge(source.cacheControl),
      ifMatch: source.etag,
    });

    return head(copied.url);
  },
  async delete(urlOrPathname: string, current?: Pick<MediaHeadRecord, "etag">) {
    return del(urlOrPathname, current ? { ifMatch: current.etag } : undefined);
  },
};
