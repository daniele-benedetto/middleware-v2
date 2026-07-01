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
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const typedError = error as RequestError;

  try {
    const { observabilityErrorsService } =
      await import("@/lib/server/modules/observability-errors/service");

    await observabilityErrorsService.recordServerError(
      {
        name: typedError.name,
        message: typedError.message,
        digest: typedError.digest,
        stack: typedError.stack,
        path: request.path,
        method: request.method,
        routePath: context.routePath,
        routeType: context.routeType,
        requestId: readRequestId(request.headers),
        metadata: {
          routerKind: context.routerKind,
          renderSource: context.renderSource ?? null,
          revalidateReason: context.revalidateReason ?? null,
        },
      },
      {
        userAgent: readHeaderValue(request.headers, "user-agent"),
        method: request.method,
        requestId: readRequestId(request.headers),
      },
    );
  } catch (telemetryError) {
    const { logServerEvent } = await import("@/lib/server/observability/log");

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
