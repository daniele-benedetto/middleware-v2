import { observabilityDefaults } from "@/lib/server/modules/observability/model/vocabulary";

export type ActiveTimeEventType =
  | "heartbeat"
  | "interaction"
  | "visibility_visible"
  | "visibility_hidden"
  | "focus"
  | "blur"
  | "page_exit";

export type ActiveTimeEvent = {
  type: ActiveTimeEventType;
  clientElapsedMs: number;
};

export type ActiveTimeOptions = {
  idleThresholdMs?: number;
  maxHeartbeatGapMs?: number;
};

export type ActiveTimeResult = {
  activeTimeMs: number;
  cappedGapCount: number;
  discardedGapCount: number;
};

function isFiniteNonNegative(value: number) {
  return Number.isFinite(value) && value >= 0;
}

function sortEvents(events: ActiveTimeEvent[]) {
  return events
    .filter((event) => isFiniteNonNegative(event.clientElapsedMs))
    .slice()
    .sort((first, second) => first.clientElapsedMs - second.clientElapsedMs);
}

export function calculateActiveTime(
  events: ActiveTimeEvent[],
  options: ActiveTimeOptions = {},
): ActiveTimeResult {
  const idleThresholdMs =
    options.idleThresholdMs ?? observabilityDefaults.activeTimeIdleThresholdMs;
  const maxHeartbeatGapMs =
    options.maxHeartbeatGapMs ?? observabilityDefaults.activeTimeMaxHeartbeatGapMs;

  let visible = true;
  let focused = true;
  let lastInteractionElapsedMs: number | null = null;
  let lastAccountingElapsedMs: number | null = null;
  let activeTimeMs = 0;
  let cappedGapCount = 0;
  let discardedGapCount = 0;

  for (const event of sortEvents(events)) {
    if (event.type === "visibility_visible") {
      visible = true;
      lastAccountingElapsedMs = event.clientElapsedMs;
      continue;
    }

    if (event.type === "focus") {
      focused = true;
      lastAccountingElapsedMs = event.clientElapsedMs;
      continue;
    }

    if (event.type === "interaction") {
      lastInteractionElapsedMs = event.clientElapsedMs;
      lastAccountingElapsedMs ??= event.clientElapsedMs;
      continue;
    }

    const shouldAccount = event.type === "heartbeat" || event.type === "page_exit";

    if (shouldAccount) {
      const recentlyInteracted =
        lastInteractionElapsedMs !== null &&
        event.clientElapsedMs - lastInteractionElapsedMs <= idleThresholdMs;
      const active = visible && focused && recentlyInteracted;
      const previousElapsedMs = lastAccountingElapsedMs ?? event.clientElapsedMs;
      const gapMs = Math.max(0, event.clientElapsedMs - previousElapsedMs);
      const capMs = event.type === "page_exit" ? idleThresholdMs : maxHeartbeatGapMs;

      if (active && gapMs > 0) {
        activeTimeMs += Math.min(gapMs, capMs);
        if (gapMs > capMs) {
          cappedGapCount += 1;
        }
      } else if (gapMs > 0) {
        discardedGapCount += 1;
      }

      lastAccountingElapsedMs = event.clientElapsedMs;
    }

    if (event.type === "visibility_hidden") {
      visible = false;
      lastAccountingElapsedMs = event.clientElapsedMs;
    }

    if (event.type === "blur") {
      focused = false;
      lastAccountingElapsedMs = event.clientElapsedMs;
    }
  }

  return { activeTimeMs, cappedGapCount, discardedGapCount };
}
