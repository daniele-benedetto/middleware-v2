export function createSingleFlightThrottle(
  task: () => Promise<void>,
  intervalMs: number,
  now: () => number = Date.now,
): () => Promise<void> {
  let lastCompletedAt: number | null = null;
  let inFlight: Promise<void> | null = null;

  return function run() {
    if (inFlight) return inFlight;
    if (lastCompletedAt !== null && now() - lastCompletedAt < intervalMs) {
      return Promise.resolve();
    }

    inFlight = task()
      .then(() => {
        lastCompletedAt = now();
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };
}
