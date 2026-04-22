import { z } from "zod";

import {
  createUserInputSchema,
  listUsersQuerySchema,
  updateUserInputSchema,
  updateUserRoleInputSchema,
  userDetailDtoSchema,
  userListDtoSchema,
  userListItemDtoSchema,
  usersService,
} from "@/lib/server/modules/users";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { adminProcedure, adminWriteProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const usersIdInputSchema = z.object({
  id: z.string().uuid(),
});

const usersListInputSchema = paginationInputSchema.extend({
  query: listUsersQuerySchema.optional(),
});

export const usersRouter = router({
  list: adminProcedure.input(usersListInputSchema).query(async ({ input }) => {
    const query = listUsersQuerySchema.parse(input.query ?? {});
    const result = await usersService.list(query, {
      page: input.page,
      pageSize: input.pageSize,
    });

    return {
      items: parseOutput(result.items, userListDtoSchema),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
      },
    };
  }),
  getById: adminProcedure.input(usersIdInputSchema).query(async ({ input }) => {
    return parseOutput(await usersService.getById(input.id), userDetailDtoSchema);
  }),
  create: adminWriteProcedure
    .use(auditMiddleware(() => ({ action: "create", resource: "users" })))
    .input(createUserInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await usersService.create(input), userListItemDtoSchema);
    }),
  update: adminWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "update",
        resource: "users",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(usersIdInputSchema.extend({ data: updateUserInputSchema }))
    .mutation(async ({ input }) => {
      return parseOutput(await usersService.update(input.id, input.data), userListItemDtoSchema);
    }),
  updateRole: adminWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "assign-role",
        resource: "users",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(usersIdInputSchema.extend({ data: updateUserRoleInputSchema }))
    .mutation(async ({ input }) => {
      return parseOutput(
        await usersService.updateRole(input.id, input.data),
        userListItemDtoSchema,
      );
    }),
  delete: adminWriteProcedure
    .use(
      auditMiddleware(({ input }) => ({
        action: "delete",
        resource: "users",
        resourceId: (input as { id: string }).id,
      })),
    )
    .input(usersIdInputSchema)
    .mutation(async ({ input }) => {
      await usersService.hardDelete(input.id);
      return { success: true };
    }),
});
