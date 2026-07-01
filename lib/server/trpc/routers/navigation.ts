import "server-only";

import { revalidatePublicNavigation } from "@/lib/public/server/revalidation";
import {
  navigationMenuDtoSchema,
  navigationMenusDtoSchema,
  navigationOptionsDtoSchema,
  navigationOptionsInputSchema,
  navigationPolicy,
  navigationService,
  updateNavigationMenuInputSchema,
  type UpdateNavigationMenuInput,
} from "@/lib/server/modules/navigation";
import { router } from "@/lib/server/trpc/init";
import { auditResourceMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import { protectedProcedure, writeProcedure } from "@/lib/server/trpc/procedures";
import { parseOutput } from "@/lib/server/validation/output";

export const navigationRouter = router({
  listMenus: protectedProcedure
    .use(requireRoleMiddleware(navigationPolicy.allowedRoles))
    .query(async () => {
      return parseOutput(await navigationService.listMenus(), navigationMenusDtoSchema);
    }),
  listOptions: protectedProcedure
    .use(requireRoleMiddleware(navigationPolicy.allowedRoles))
    .input(navigationOptionsInputSchema)
    .query(async ({ input }) => {
      return parseOutput(await navigationService.listOptions(input), navigationOptionsDtoSchema);
    }),
  update: writeProcedure
    .use(requireRoleMiddleware(navigationPolicy.allowedRoles))
    .input(updateNavigationMenuInputSchema)
    .use(
      auditResourceMiddleware<UpdateNavigationMenuInput>((input) => ({
        action: "update_navigation",
        resourceType: "navigation",
        resourceId: input.key,
      })),
    )
    .mutation(async ({ input }) => {
      const menu = parseOutput(await navigationService.update(input), navigationMenuDtoSchema);
      revalidatePublicNavigation();
      return menu;
    }),
});
