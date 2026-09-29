import { ApiError } from "@/lib/server/http/api-error";

import type { PrintEditionStatus } from "@/lib/print/edition-schema";

const allowedTransitions: Record<PrintEditionStatus, readonly PrintEditionStatus[]> = {
  DRAFT: ["DRAFT", "IN_REVIEW"],
  IN_REVIEW: ["DRAFT", "IN_REVIEW", "APPROVED"],
  APPROVED: ["IN_REVIEW", "APPROVED", "EXPORTED"],
  EXPORTED: ["EXPORTED"],
};

export function assertPrintEditionTransition(
  current: PrintEditionStatus,
  next: PrintEditionStatus,
) {
  if (!allowedTransitions[current].includes(next)) {
    throw new ApiError(409, "CONFLICT", `Transizione non valida: ${current} → ${next}.`);
  }
}
