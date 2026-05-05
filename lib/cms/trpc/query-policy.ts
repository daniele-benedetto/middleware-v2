const ONE_SECOND_MS = 1_000;
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;

export const cmsQueryPolicy = {
  list: {
    staleTimeMs: 30 * ONE_SECOND_MS,
    gcTimeMs: 5 * ONE_MINUTE_MS,
    retryCount: 1,
  },
  options: {
    staleTimeMs: ONE_MINUTE_MS,
  },
} as const;

export const cmsQueryClientDefaultOptions = {
  queries: {
    staleTime: cmsQueryPolicy.list.staleTimeMs,
    gcTime: cmsQueryPolicy.list.gcTimeMs,
    retry: cmsQueryPolicy.list.retryCount,
  },
} as const;
