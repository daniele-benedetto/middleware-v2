import "server-only";

import { notFound } from "next/navigation";
import { z } from "zod";

import { hasCmsTrpcErrorCode, isCmsNotFoundLikeError } from "@/lib/cms/trpc";

const cmsRouteEntityIdSchema = z.string().uuid();

export function resolveCmsRouteEntityIdOrNotFound(id: string) {
  if (!cmsRouteEntityIdSchema.safeParse(id).success) {
    notFound();
  }

  return id;
}

export async function prefetchCmsDetailOrNotFound<T>(loader: () => Promise<T>) {
  try {
    return await loader();
  } catch (error) {
    if (isCmsNotFoundLikeError(error) || hasCmsTrpcErrorCode(error, "BAD_REQUEST")) {
      notFound();
    }

    throw error;
  }
}
