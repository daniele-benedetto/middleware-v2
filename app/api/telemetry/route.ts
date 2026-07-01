import { enforceRateLimitKey, rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { getRequestClientIp, getRequestId, getRequestUserAgent } from "@/lib/server/http/request";
import { telemetryCollectorPayloadSchema } from "@/lib/server/modules/telemetry/schema";
import { telemetryService } from "@/lib/server/modules/telemetry/service";
import { logServerEvent } from "@/lib/server/observability/log";

const maxTelemetryPayloadBytes = 16 * 1024;

function emptyResponse() {
  return new Response(null, { status: 204 });
}

function readCountryHeader(request: Request) {
  const value = request.headers.get("cf-ipcountry")?.trim().toUpperCase();
  return value && value.length === 2 ? value : null;
}

function isOversizedRequest(request: Request) {
  const contentLength = request.headers.get("content-length");

  if (!contentLength) {
    return false;
  }

  const parsedValue = Number(contentLength);
  return Number.isFinite(parsedValue) && parsedValue > maxTelemetryPayloadBytes;
}

function readGlobalPrivacyControl(request: Request) {
  return request.headers.get("sec-gpc")?.trim() ?? null;
}

function readDoNotTrack(request: Request) {
  return request.headers.get("dnt")?.trim() ?? null;
}

async function enforceCollectorRateLimit(request: Request, sessionId: string) {
  const ipAddress = getRequestClientIp(request) ?? "unknown";

  await enforceRateLimitKey(`ip:${ipAddress}`, rateLimitPolicies.telemetryIp);
  await enforceRateLimitKey(`session:${sessionId}`, rateLimitPolicies.telemetrySession);
}

export async function POST(request: Request) {
  if (isOversizedRequest(request)) {
    return emptyResponse();
  }

  try {
    const body = await request.text();

    if (body.length > maxTelemetryPayloadBytes) {
      return emptyResponse();
    }

    const parsedJson = JSON.parse(body) as unknown;
    const parsedPayload = telemetryCollectorPayloadSchema.safeParse(parsedJson);

    if (!parsedPayload.success) {
      return emptyResponse();
    }

    try {
      await enforceCollectorRateLimit(request, parsedPayload.data.sessionId);
    } catch {
      return emptyResponse();
    }

    await telemetryService.recordTelemetryPayload(parsedPayload.data, {
      ipAddress: getRequestClientIp(request),
      userAgent: getRequestUserAgent(request),
      country: readCountryHeader(request),
      method: request.method,
      requestId: getRequestId(request),
      doNotTrack: readDoNotTrack(request),
      globalPrivacyControl: readGlobalPrivacyControl(request),
    });
  } catch (error) {
    logServerEvent({
      event: "TELEMETRY_COLLECTOR_ERROR",
      level: "error",
      method: request.method,
      path: new URL(request.url).pathname,
      requestId: getRequestId(request),
      error,
    });
  }

  return emptyResponse();
}
