export type BulkExecutionFailure = {
  id: string;
  error: unknown;
};

export type BulkExecutionResult = {
  success: number;
  failed: number;
  failures: BulkExecutionFailure[];
};

export async function executeBulk(ids: string[], runner: (id: string) => Promise<unknown>) {
  const results = await Promise.allSettled(ids.map((id) => runner(id)));

  const success = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.length - success;
  const failures = results.reduce<BulkExecutionFailure[]>((acc, result, index) => {
    if (result.status === "rejected") {
      const id = ids[index];

      if (id) {
        acc.push({ id, error: result.reason });
      }
    }

    return acc;
  }, []);

  return { success, failed, failures } satisfies BulkExecutionResult;
}
