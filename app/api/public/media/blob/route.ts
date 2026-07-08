import { parseMediaPathname } from "@/lib/media/blob";
import { parseByteRangeHeader } from "@/lib/server/http/byte-range";
import { getRequestId, getRequestPath } from "@/lib/server/http/request";
import { publicMediaService } from "@/lib/server/modules/media/service/public";
import { logServerEvent } from "@/lib/server/observability/log";
import { StorageAccessError, StorageNotFoundError } from "@/lib/server/storage/errors";
import { mediaStorage } from "@/lib/server/storage/media-storage";

function buildContentDisposition(pathname: string) {
  const { fileName } = parseMediaPathname(pathname);
  const encodedFileName = encodeURIComponent(fileName);

  return `inline; filename*=UTF-8''${encodedFileName}`;
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

    if (
      !metadata.contentType ||
      (!metadata.contentType.startsWith("image/") && !metadata.contentType.startsWith("audio/"))
    ) {
      return new Response("Not found", { status: 404 });
    }

    const range = metadata.contentType.startsWith("audio/")
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
        "content-type": metadata.contentType,
        "content-disposition": buildContentDisposition(result.pathname),
        "content-length": String(isPartial && range ? range.size : metadata.size),
        "accept-ranges": metadata.contentType.startsWith("audio/") ? "bytes" : "none",
        ...(isPartial && range
          ? { "content-range": `bytes ${range.start}-${range.end}/${metadata.size}` }
          : {}),
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
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
