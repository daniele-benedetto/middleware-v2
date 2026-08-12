import "server-only";

import { z } from "zod";

import {
  createMapInputSchema,
  createMapItemInputSchema,
  listMapsQuerySchema,
  mapDetailDtoSchema,
  mapDtoSchema,
  mapItemDtoSchema,
  mapItemsListDtoSchema,
  mapsListDtoSchema,
  mapsPolicy,
  mapsService,
  mapAddressSuggestionDtoSchema,
  reorderMapItemsInputSchema,
  mapsGeocodingService,
  searchMapAddressInputSchema,
  updateMapInputSchema,
  updateMapItemInputSchema,
} from "@/lib/server/modules/maps";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import {
  externalReadProcedure,
  protectedProcedure,
  reorderProcedure,
  writeProcedure,
} from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { successOutputSchema } from "@/lib/server/trpc/schemas/result";
import { parseOutput } from "@/lib/server/validation/output";

const mapIdInputSchema = z.object({ id: z.string().uuid() });
const mapItemIdInputSchema = z.object({ mapId: z.string().uuid(), itemId: z.string().uuid() });
const mapsListInputSchema = paginationInputSchema.extend({
  query: listMapsQuerySchema.default({ sortOrder: "desc" }),
});

export const mapsRouter = router({
  searchAddress: externalReadProcedure
    .use(requireRoleMiddleware(mapsPolicy.allowedRoles))
    .input(searchMapAddressInputSchema)
    .query(async ({ input }) =>
      parseOutput(
        await mapsGeocodingService.searchAddress(input.query),
        z.array(mapAddressSuggestionDtoSchema),
      ),
    ),
  list: protectedProcedure
    .use(requireRoleMiddleware(mapsPolicy.allowedRoles))
    .input(mapsListInputSchema)
    .query(async ({ input }) => {
      const result = await mapsService.list(input.query, {
        page: input.page,
        pageSize: input.pageSize,
      });
      return {
        items: parseOutput(result.items, mapsListDtoSchema),
        pagination: { page: input.page, pageSize: input.pageSize, total: result.total },
      };
    }),
  getById: protectedProcedure
    .use(requireRoleMiddleware(mapsPolicy.allowedRoles))
    .input(mapIdInputSchema)
    .query(async ({ input }) =>
      parseOutput(await mapsService.getById(input.id), mapDetailDtoSchema),
    ),
  create: writeProcedure
    .use(requireRoleMiddleware(mapsPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "create", resource: "maps" })))
    .input(createMapInputSchema)
    .mutation(async ({ input }) => parseOutput(await mapsService.create(input), mapDtoSchema)),
  update: writeProcedure
    .use(requireRoleMiddleware(mapsPolicy.allowedRoles))
    .input(mapIdInputSchema.extend({ data: updateMapInputSchema }))
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "update",
        resource: "maps",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) =>
      parseOutput(await mapsService.update(input.id, input.data), mapDtoSchema),
    ),
  delete: writeProcedure
    .use(requireRoleMiddleware(mapsPolicy.allowedRoles))
    .input(mapIdInputSchema)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resource: "maps",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      await mapsService.delete(input.id);
      return parseOutput({ success: true }, successOutputSchema);
    }),
  createItem: writeProcedure
    .use(requireRoleMiddleware(mapsPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "create", resource: "map-items" })))
    .input(createMapItemInputSchema)
    .mutation(async ({ input }) =>
      parseOutput(await mapsService.createItem(input), mapItemDtoSchema),
    ),
  updateItem: writeProcedure
    .use(requireRoleMiddleware(mapsPolicy.allowedRoles))
    .input(mapItemIdInputSchema.extend({ data: updateMapItemInputSchema }))
    .use(
      auditMiddleware<{ itemId: string }>((input) => ({
        action: "update",
        resource: "map-items",
        resourceId: input.itemId,
      })),
    )
    .mutation(async ({ input }) =>
      parseOutput(
        await mapsService.updateItem(input.mapId, input.itemId, input.data),
        mapItemDtoSchema,
      ),
    ),
  deleteItem: writeProcedure
    .use(requireRoleMiddleware(mapsPolicy.allowedRoles))
    .input(mapItemIdInputSchema)
    .use(
      auditMiddleware<{ itemId: string }>((input) => ({
        action: "delete",
        resource: "map-items",
        resourceId: input.itemId,
      })),
    )
    .mutation(async ({ input }) => {
      await mapsService.deleteItem(input.mapId, input.itemId);
      return parseOutput({ success: true }, successOutputSchema);
    }),
  reorderItems: reorderProcedure
    .use(requireRoleMiddleware(mapsPolicy.allowedRoles))
    .use(auditMiddleware(() => ({ action: "reorder", resource: "map-items" })))
    .input(reorderMapItemsInputSchema)
    .mutation(async ({ input }) =>
      parseOutput(await mapsService.reorderItems(input), mapItemsListDtoSchema),
    ),
});
