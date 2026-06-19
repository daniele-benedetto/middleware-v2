import { NextResponse } from "next/server";

import { CMS_NEXT_PATH_HEADER } from "@/lib/cms/redirect";

import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CMS_NEXT_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/cms/:path*"],
};
