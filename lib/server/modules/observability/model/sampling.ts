export type SampledCountInput = {
  count: number;
  sampleRate?: number | null;
};

export function normalizeSampleRate(sampleRate: number | null | undefined) {
  if (!Number.isFinite(sampleRate) || !sampleRate || sampleRate <= 0 || sampleRate > 1) {
    return 1;
  }

  return sampleRate;
}

export function toWeightedSampleCount(input: SampledCountInput) {
  return input.count / normalizeSampleRate(input.sampleRate);
}

export function sumWeightedSampleCounts(inputs: SampledCountInput[]) {
  return inputs.reduce((sum, input) => sum + toWeightedSampleCount(input), 0);
}

export function isSampledEventType(eventType: string) {
  return eventType === "session_heartbeat" || eventType === "scroll_milestone";
}
