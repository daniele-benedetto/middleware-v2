import "server-only";

function readHeaderValue(headers: Headers, name: string) {
  const value = headers.get(name)?.trim();
  return value ? value : null;
}

export function getRequestClientIp(request: Request) {
  const forwardedFor = readHeaderValue(request.headers, "x-forwarded-for");

  if (forwardedFor) {
    const [ip] = forwardedFor.split(",");
    return ip?.trim() || null;
  }

  return readHeaderValue(request.headers, "x-real-ip");
}

export function getRequestId(request: Request) {
  return (
    readHeaderValue(request.headers, "x-vercel-id") ??
    readHeaderValue(request.headers, "x-request-id") ??
    readHeaderValue(request.headers, "traceparent")
  );
}

export function getRequestPath(request: Request) {
  return new URL(request.url).pathname;
}

export function getRequestUserAgent(request: Request) {
  return readHeaderValue(request.headers, "user-agent");
}
