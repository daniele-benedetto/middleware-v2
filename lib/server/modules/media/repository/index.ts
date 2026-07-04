import "server-only";

import { extractCmsMediaPathname } from "@/lib/media/blob";
import { mediaStorage } from "@/lib/server/storage/media-storage";

type MediaHeadRecord = Awaited<ReturnType<typeof mediaStorage.head>>;

function toPathname(value: string) {
  return extractCmsMediaPathname(value) ?? value;
}

export const mediaRepository = {
  async listAll() {
    return mediaStorage.listAll();
  },
  async head(urlOrPathname: string) {
    return mediaStorage.head(toPathname(urlOrPathname));
  },
  async rename(url: string, nextPathname: string, current?: MediaHeadRecord) {
    const source = current ?? (await mediaStorage.head(toPathname(url)));
    return mediaStorage.copy(source.pathname, nextPathname);
  },
  async delete(urlOrPathname: string, current?: Pick<MediaHeadRecord, "etag">) {
    return mediaStorage.delete({ pathname: toPathname(urlOrPathname), etag: current?.etag });
  },
};
