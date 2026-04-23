import "server-only";

import { z } from "zod";

import {
  createUserInputSchema,
  listUsersQuerySchema,
  updateUserInputSchema,
  updateUserRoleInputSchema,
  userDetailDtoSchema,
  userListDtoSchema,
  userListItemDtoSchema,
  usersPolicy,
  usersService,
} from "@/lib/server/modules/users";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure, sensitiveWriteProcedure } from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { parseOutput } from "@/lib/server/validation/output";

const usersIdInputSchema = z.object({
  id: z.string().uuid(),
});

const usersListInputSchema = paginationInputSchema.extend({
  query: listUsersQuerySchema.default({
    sortBy: "createdAt",
    sortOrder: "desc",
  }),
});

export const usersRouter = router({
  list: protectedProcedure
    .use(requireRoleMiddleware(usersPolicy.listAllowedRoles))
    .input(usersListInputSchema)
    .query(async ({ input }) => {
      const result = await usersService.list(input.query, {
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
  getById: protectedProcedure
    .use(requireRoleMiddleware(usersPolicy.readAllowedRoles))
    .input(usersIdInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await usersService.getById(input.id), userDetailDtoSchema);
    }),
  create: sensitiveWriteProcedure
    .use(requireRoleMiddleware(usersPolicy.createAllowedRoles))
    .use(auditMiddleware(() => ({ action: "create", resource: "users" })))
    .input(createUserInputSchema)
    .mutation(async ({ input }) => {
      return parseOutput(await usersService.create(input), userListItemDtoSchema);
    }),
  update: sensitiveWriteProcedure
    .use(requireRoleMiddleware(usersPolicy.updateAllowedRoles))
    .use(
      auditMiddleware<{ id: string; data: z.infer<typeof updateUserInputSchema> }>((input) => ({
        action: "update",
        resource: "users",
        resourceId: input.id,
      })),
    )
    .input(usersIdInputSchema.extend({ data: updateUserInputSchema }))
    .mutation(async ({ input }) => {
      return parseOutput(await usersService.update(input.id, input.data), userListItemDtoSchema);
    }),
  updateRole: sensitiveWriteProcedure
    .use(requireRoleMiddleware(usersPolicy.updateRoleAllowedRoles))
    .use(
      auditMiddleware<{ id: string; data: z.infer<typeof updateUserRoleInputSchema> }>((input) => ({
        action: "assign-role",
        resource: "users",
        resourceId: input.id,
      })),
    )
    .input(usersIdInputSchema.extend({ data: updateUserRoleInputSchema }))
    .mutation(async ({ input }) => {
      return parseOutput(
        await usersService.updateRole(input.id, input.data),
        userListItemDtoSchema,
      );
    }),
  delete: sensitiveWriteProcedure
    .use(requireRoleMiddleware(usersPolicy.deleteAllowedRoles))
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resource: "users",
        resourceId: input.id,
      })),
    )
    .input(usersIdInputSchema)
    .mutation(async ({ input }) => {
      await usersService.delete(input.id);
      return { success: true };
    }),
});
