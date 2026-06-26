import "server-only";

type LogLevel = "info" | "warn" | "error";

type LogEvent = {
  event: string;
  level?: LogLevel;
  requestId?: string | null;
  path?: string | null;
  method?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  error?: unknown;
};

function serializeError(error: unknown) {
  if (!(error instanceof Error)) {
    return error === undefined ? undefined : { value: String(error) };
  }

  return {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
  };
}

export function logServerEvent({
  event,
  level = "info",
  requestId,
  path,
  method,
  userId,
  metadata,
  error,
}: LogEvent) {
  const payload = {
    event,
    level,
    timestamp: new Date().toISOString(),
    requestId: requestId ?? undefined,
    path: path ?? undefined,
    method: method ?? undefined,
    userId: userId ?? undefined,
    metadata,
    error: serializeError(error),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}
