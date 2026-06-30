import { parseMediaPathname } from "@/lib/media/blob";
import { getRequestId, getRequestPath } from "@/lib/server/http/request";
import {
  buildUnsatisfiedRangeHeader,
  parseMediaRangeHeader,
} from "@/lib/server/modules/media/range";
import { publicMediaService } from "@/lib/server/modules/media/service/public";
import { logServerEvent } from "@/lib/server/observability/log";
import { StorageAccessError, StorageNotFoundError } from "@/lib/server/storage/errors";
import { mediaStorage } from "@/lib/server/storage/media-storage";

function buildContentDisposition(pathname: string) {
  const { fileName } = parseMediaPathname(pathname);
  const encodedFileName = encodeURIComponent(fileName);

  return `inline; filename*=UTF-8''${encodedFileName}`;
}

function buildPublicMediaHeaders({
  contentType,
  pathname,
  size,
  range,
}: {
  contentType: string;
  pathname: string;
  size: number;
  range: ReturnType<typeof parseMediaRangeHeader>;
}) {
  const headers = new Headers({
    "content-type": contentType,
    "content-disposition": buildContentDisposition(pathname),
    "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    "accept-ranges": "bytes",
    "x-content-type-options": "nosniff",
  });

  if (range) {
    headers.set("content-range", `bytes ${range.start}-${range.end}/${size}`);
    headers.set("content-length", String(range.end - range.start + 1));
    return headers;
  }

  if (size > 0) {
    headers.set("content-length", String(size));
  }

  return headers;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pathname = url.searchParams.get("pathname")?.trim();

  if (!pathname) {
    return new Response("Missing pathname", { status: 400 });
  }

  const canServe = await publicMediaService.canServePublishedMedia(pathname);

  if (!canServe) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const metadata = await mediaStorage.head(pathname);
    const range = parseMediaRangeHeader(request.headers.get("range"), metadata.size);

    if (request.headers.has("range") && !range) {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: {
          "content-range": buildUnsatisfiedRangeHeader(metadata.size),
          "accept-ranges": "bytes",
        },
      });
    }

    if (
      !metadata.contentType ||
      (!metadata.contentType.startsWith("image/") && !metadata.contentType.startsWith("audio/"))
    ) {
      return new Response("Not found", { status: 404 });
    }

    const result = await mediaStorage.get(pathname, range ? { range: range.header } : undefined);

    return new Response(result.stream, {
      status: range ? 206 : 200,
      headers: buildPublicMediaHeaders({
        contentType: metadata.contentType,
        pathname: result.pathname,
        size: metadata.size,
        range,
      }),
    });
  } catch (error) {
    if (error instanceof StorageNotFoundError || error instanceof StorageAccessError) {
      return new Response("Not found", { status: 404 });
    }

    logServerEvent({
      event: "PUBLIC_BLOB_READ_FAILED",
      level: "error",
      requestId: getRequestId(request),
      path: getRequestPath(request),
      method: request.method,
      metadata: { pathname },
      error,
    });

    return new Response("Internal error", { status: 500 });
  }
}
