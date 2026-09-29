import "server-only";

import {
  createPrintEditionInputSchema,
  duplicatePrintEditionInputSchema,
  printEditionDtoSchema,
  printEditionIdInputSchema,
  printEditionListQuerySchema,
  printEditionsListDtoSchema,
  printEditionsPolicy,
  printEditionsService,
  updatePrintEditionInputSchema,
} from "@/lib/server/modules/print-editions";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure, writeProcedure } from "@/lib/server/trpc/procedures";
import { successOutputSchema } from "@/lib/server/trpc/schemas/result";
import { parseOutput } from "@/lib/server/validation/output";

export const printEditionsRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(printEditionsPolicy.allowedRoles))
    .input(printEditionListQuerySchema)
    .query(async ({ input }) =>
      parseOutput(await printEditionsService.list(input), printEditionsListDtoSchema),
    ),
  getById: protectedProcedure
    .use(requireRoleMiddleware(printEditionsPolicy.allowedRoles))
    .input(printEditionIdInputSchema)
    .query(async ({ input }) =>
      parseOutput(await printEditionsService.getById(input.id), printEditionDtoSchema),
    ),
  create: writeProcedure
    .use(requireRoleMiddleware(printEditionsPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "create", resource: "print_editions" })))
    .input(createPrintEditionInputSchema)
    .mutation(async ({ input }) =>
      parseOutput(await printEditionsService.create(input), printEditionDtoSchema),
    ),
  update: writeProcedure
    .use(requireRoleMiddleware(printEditionsPolicy.allowedRoles))
    .input(updatePrintEditionInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "update",
        resource: "print_editions",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) =>
      parseOutput(await printEditionsService.update(input), printEditionDtoSchema),
    ),
  duplicate: writeProcedure
    .use(requireRoleMiddleware(printEditionsPolicy.allowedRoles))
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "duplicate",
        resource: "print_editions",
        resourceId: input.id,
      })),
    )
    .input(duplicatePrintEditionInputSchema)
    .mutation(async ({ input }) =>
      parseOutput(await printEditionsService.duplicate(input.id), printEditionDtoSchema),
    ),
  delete: writeProcedure
    .use(requireRoleMiddleware(printEditionsPolicy.allowedRoles))
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resource: "print_editions",
        resourceId: input.id,
      })),
    )
    .input(printEditionIdInputSchema)
    .mutation(async ({ input }) =>
      parseOutput(await printEditionsService.delete(input.id), successOutputSchema),
    ),
});
