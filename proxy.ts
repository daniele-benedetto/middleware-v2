import { NextResponse } from "next/server";

import { CMS_NEXT_PATH_HEADER } from "@/lib/cms/redirect";
import {
  PUBLIC_NOT_FOUND_PATH,
  resolvePublicContentRoute,
} from "@/lib/public/routes/public-content-route";
import { isPublicContentAvailable } from "@/lib/public/server/content-availability";

import type { NextRequest } from "next/server";

function isCmsPath(pathname: string): boolean {
  return pathname === "/cms" || pathname.startsWith("/cms/");
}

function withCmsNextPath(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CMS_NEXT_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function isDocumentRead(request: NextRequest): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  return !request.headers.has("rsc") && !request.headers.has("next-router-prefetch");
}

async function withPublicContentStatus(request: NextRequest) {
  const route = isDocumentRead(request)
    ? resolvePublicContentRoute(request.nextUrl.pathname)
    : null;

  if (!route) {
    return NextResponse.next();
  }

  try {
    if (await isPublicContentAvailable(route)) {
      return NextResponse.next();
    }
  } catch (error) {
    console.error("proxy.publicContentStatus lookup failed", {
      pathname: request.nextUrl.pathname,
      error,
    });
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL(PUBLIC_NOT_FOUND_PATH, request.url), { status: 404 });
}

export async function proxy(request: NextRequest) {
  if (isCmsPath(request.nextUrl.pathname)) {
    return withCmsNextPath(request);
  }

  return withPublicContentStatus(request);
}

export const config = {
  matcher: [
    "/cms/:path*",
    "/articoli/:path+",
    "/uscite/:path+",
    "/contro-formazione/:path+",
    "/questionari/:path+",
    "/:segment",
  ],
};
