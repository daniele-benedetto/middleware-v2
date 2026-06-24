import { BlobAccessError, BlobNotFoundError, get } from "@vercel/blob";

import { cmsMediaBlobAccess, parseMediaPathname } from "@/lib/media/blob";
import { publicMediaService } from "@/lib/server/modules/media/service/public";

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
    const result = await get(pathname, {
      access: cmsMediaBlobAccess,
      useCache: true,
    });

    if (
      !result ||
      result.statusCode !== 200 ||
      (!result.blob.contentType.startsWith("image/") &&
        !result.blob.contentType.startsWith("audio/"))
    ) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(result.stream, {
      status: 200,
      headers: {
        "content-type": result.blob.contentType,
        "content-disposition": buildContentDisposition(result.blob.pathname),
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    if (error instanceof BlobNotFoundError || error instanceof BlobAccessError) {
      return new Response("Not found", { status: 404 });
    }

    return new Response("Internal error", { status: 500 });
  }
}
