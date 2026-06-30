import { parseMediaPathname } from "@/lib/media/blob";
import { getAuthSession } from "@/lib/server/auth/session";
import { getRequestId, getRequestPath } from "@/lib/server/http/request";
import { mediaPolicy } from "@/lib/server/modules/media";
import {
  buildUnsatisfiedRangeHeader,
  parseMediaRangeHeader,
} from "@/lib/server/modules/media/range";
import { logServerEvent } from "@/lib/server/observability/log";
import { StorageAccessError, StorageNotFoundError } from "@/lib/server/storage/errors";
import { mediaStorage } from "@/lib/server/storage/media-storage";

function buildContentDisposition(pathname: string, download: boolean) {
  const { fileName } = parseMediaPathname(pathname);
  const encodedFileName = encodeURIComponent(fileName);

  return `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodedFileName}`;
}

function buildCmsMediaHeaders({
  contentType,
  pathname,
  download,
  size,
  range,
}: {
  contentType: string;
  pathname: string;
  download: boolean;
  size: number;
  range: ReturnType<typeof parseMediaRangeHeader>;
}) {
  const headers = new Headers({
    "content-type": contentType,
    "content-disposition": buildContentDisposition(pathname, download),
    "cache-control": "private, no-store, max-age=0",
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
  const session = await getAuthSession(request);

  if (!session || !mediaPolicy.allowedRoles.includes(session.user.role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const pathname = url.searchParams.get("pathname")?.trim();
  const shouldDownload = url.searchParams.get("download") === "1";

  if (!pathname) {
    return new Response("Missing pathname", { status: 400 });
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

    const result = await mediaStorage.get(pathname, range ? { range: range.header } : undefined);

    return new Response(result.stream, {
      status: range ? 206 : 200,
      headers: buildCmsMediaHeaders({
        contentType: metadata.contentType ?? "application/octet-stream",
        pathname: result.pathname,
        download: shouldDownload,
        size: metadata.size,
        range,
      }),
    });
  } catch (error) {
    if (error instanceof StorageNotFoundError) {
      return new Response("Not found", { status: 404 });
    }

    if (error instanceof StorageAccessError) {
      return new Response("Forbidden", { status: 403 });
    }

    logServerEvent({
      event: "CMS_BLOB_READ_FAILED",
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
