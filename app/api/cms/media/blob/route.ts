import { parseMediaPathname } from "@/lib/media/blob";
import { getAuthSession } from "@/lib/server/auth/session";
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
    const result = await mediaStorage.get(pathname);

    return new Response(result.stream, {
      status: 200,
      headers: {
        "content-type": result.contentType ?? "application/octet-stream",
        "content-disposition": buildContentDisposition(result.pathname, shouldDownload),
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
