export type BotSignalInput = {
  userAgent?: string | null;
  interactionCount?: number;
  scrollEventCount?: number;
  heartbeatCount?: number;
  clientServerSkewMs?: number | null;
  headlessMarker?: boolean;
  suspiciousHeaderMismatch?: boolean;
};

export type BotAssessment = {
  isLikelyBot: boolean;
  reasons: string[];
};

const botUserAgentPattern =
  /(bot|crawler|spider|preview|facebookexternalhit|slurp|headless|phantom|playwright|puppeteer)/i;
const maxClientServerSkewMs = 10 * 60 * 1000;

export function assessLikelyBot(input: BotSignalInput): BotAssessment {
  const reasons: string[] = [];
  const userAgent = input.userAgent?.trim() ?? "";

  if (!userAgent || botUserAgentPattern.test(userAgent)) {
    reasons.push("bot_user_agent");
  }

  if (
    (input.heartbeatCount ?? 0) > 0 &&
    (input.interactionCount ?? 0) === 0 &&
    (input.scrollEventCount ?? 0) === 0
  ) {
    reasons.push("no_human_signals");
  }

  if (input.headlessMarker) {
    reasons.push("headless_marker");
  }

  if (input.suspiciousHeaderMismatch) {
    reasons.push("header_mismatch");
  }

  if (input.clientServerSkewMs !== null && input.clientServerSkewMs !== undefined) {
    if (Math.abs(input.clientServerSkewMs) > maxClientServerSkewMs) {
      reasons.push("excessive_client_server_skew");
    }
  }

  return { isLikelyBot: reasons.length > 0, reasons };
}
