export type BulkExecutionResult = {
  success: number;
  failed: number;
};

export async function executeBulk(ids: string[], runner: (id: string) => Promise<unknown>) {
  const results = await Promise.allSettled(ids.map((id) => runner(id)));

  const success = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.length - success;

  return { success, failed } satisfies BulkExecutionResult;
}
