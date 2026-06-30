export type ClientTimingInput = {
  clientSequence?: number | null;
  clientElapsedMs?: number | null;
  previousClientElapsedMs?: number | null;
};

export type ClientTimingSanityResult = {
  accepted: boolean;
  suspicious: boolean;
  reasons: string[];
};

const maxReasonableClientGapMs = 60 * 60 * 1000;

export function evaluateClientTimingSanity(input: ClientTimingInput): ClientTimingSanityResult {
  const reasons: string[] = [];

  if (input.clientSequence !== undefined && input.clientSequence !== null) {
    if (!Number.isInteger(input.clientSequence) || input.clientSequence < 0) {
      reasons.push("invalid_client_sequence");
    }
  }

  if (input.clientElapsedMs !== undefined && input.clientElapsedMs !== null) {
    if (!Number.isFinite(input.clientElapsedMs) || input.clientElapsedMs < 0) {
      reasons.push("invalid_client_elapsed_ms");
    }
  }

  if (
    input.clientElapsedMs !== undefined &&
    input.clientElapsedMs !== null &&
    input.previousClientElapsedMs !== undefined &&
    input.previousClientElapsedMs !== null
  ) {
    const delta = input.clientElapsedMs - input.previousClientElapsedMs;

    if (delta < 0) {
      reasons.push("negative_client_delta");
    }

    if (delta > maxReasonableClientGapMs) {
      reasons.push("excessive_client_delta");
    }
  }

  return {
    accepted: !reasons.some((reason) => reason.startsWith("invalid_")),
    suspicious: reasons.length > 0,
    reasons,
  };
}
