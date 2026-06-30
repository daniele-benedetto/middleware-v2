import { telemetryService } from "@/lib/server/modules/telemetry/service";
import { logServerEvent } from "@/lib/server/observability/log";

import type { Instrumentation } from "next";

type RequestError = Error & { digest?: string };

function readHeaderValue(headers: Record<string, string | string[] | undefined>, name: string) {
  const value = headers[name] ?? headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  return value?.trim() || null;
}

function readRequestId(headers: Record<string, string | string[] | undefined>) {
  return (
    readHeaderValue(headers, "x-vercel-id") ??
    readHeaderValue(headers, "x-request-id") ??
    readHeaderValue(headers, "traceparent")
  );
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const typedError = error as RequestError;

  try {
    await telemetryService.recordServerError({
      source: "server",
      name: typedError.name,
      message: typedError.message,
      digest: typedError.digest,
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
      requestId: readRequestId(request.headers),
      userAgent: readHeaderValue(request.headers, "user-agent"),
      metadata: {
        routerKind: context.routerKind,
        renderSource: context.renderSource ?? null,
        revalidateReason: context.revalidateReason ?? null,
      },
    });
  } catch (telemetryError) {
    logServerEvent({
      event: "REQUEST_ERROR_TELEMETRY_FAILED",
      level: "error",
      path: request.path,
      method: request.method,
      requestId: readRequestId(request.headers),
      error: telemetryError,
    });
  }
};
