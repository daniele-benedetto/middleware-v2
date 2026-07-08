import { parseMediaPathname } from "@/lib/media/blob";
import { getAuthSession } from "@/lib/server/auth/session";
import { parseByteRangeHeader } from "@/lib/server/http/byte-range";
import { getRequestId, getRequestPath } from "@/lib/server/http/request";
import { mediaPolicy } from "@/lib/server/modules/media";
import { logServerEvent } from "@/lib/server/observability/log";
import { StorageAccessError, StorageNotFoundError } from "@/lib/server/storage/errors";
import { mediaStorage } from "@/lib/server/storage/media-storage";

function buildContentDisposition(pathname: string, download: boolean) {
  const { fileName } = parseMediaPathname(pathname);
  const encodedFileName = encodeURIComponent(fileName);

  return `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodedFileName}`;
}

function buildUnsatisfiableRangeResponse(size: number) {
  return new Response("Range not satisfiable", {
    status: 416,
    headers: {
      "content-range": `bytes */${size}`,
      "accept-ranges": "bytes",
    },
  });
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
    const contentType = metadata.contentType ?? "application/octet-stream";
    const range = contentType.startsWith("audio/")
      ? parseByteRangeHeader(request.headers.get("range"), metadata.size)
      : null;

    if (range === "invalid") {
      return buildUnsatisfiableRangeResponse(metadata.size);
    }

    const result = await mediaStorage.get(
      pathname,
      range ? { range: `bytes=${range.start}-${range.end}` } : undefined,
    );
    const isPartial = Boolean(range);

    return new Response(result.stream, {
      status: isPartial ? 206 : 200,
      headers: {
        "content-type": contentType,
        "content-disposition": buildContentDisposition(result.pathname, shouldDownload),
        "content-length": String(isPartial && range ? range.size : metadata.size),
        "accept-ranges": contentType.startsWith("audio/") ? "bytes" : "none",
        ...(isPartial && range
          ? { "content-range": `bytes ${range.start}-${range.end}/${metadata.size}` }
          : {}),
        "cache-control": "private, no-store, max-age=0",
      },
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
