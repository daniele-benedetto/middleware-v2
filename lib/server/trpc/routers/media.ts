import "server-only";

import {
  deleteMediaInputSchema,
  deleteMediaResultDtoSchema,
  mediaListDtoSchema,
  mediaPolicy,
  mediaService,
  renameMediaInputSchema,
  renameMediaResultDtoSchema,
} from "@/lib/server/modules/media";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure, writeProcedure } from "@/lib/server/trpc/procedures";
import { parseOutput } from "@/lib/server/validation/output";

export const mediaRouter = router({
  list: protectedProcedure.use(requireRoleMiddleware(mediaPolicy.allowedRoles)).query(async () => {
    return parseOutput(await mediaService.list(), mediaListDtoSchema);
  }),
  rename: writeProcedure
    .use(requireRoleMiddleware(mediaPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "rename", resource: "media" })))
    .input(renameMediaInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await mediaService.rename(input), renameMediaResultDtoSchema);
    }),
  delete: writeProcedure
    .use(requireRoleMiddleware(mediaPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "delete", resource: "media" })))
    .input(deleteMediaInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await mediaService.delete(input), deleteMediaResultDtoSchema);
    }),
});
