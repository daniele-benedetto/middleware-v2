import { parseMediaPathname } from "@/lib/media/blob";
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
    const result = await mediaStorage.get(pathname);

    if (
      !result.contentType ||
      (!result.contentType.startsWith("image/") && !result.contentType.startsWith("audio/"))
    ) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(result.stream, {
      status: 200,
      headers: {
        "content-type": result.contentType,
        "content-disposition": buildContentDisposition(result.pathname),
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
