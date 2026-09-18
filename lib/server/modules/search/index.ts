export {
  publicSearchResponseDtoSchema,
  publicSearchResultsDtoSchema,
} from "@/lib/server/modules/search/dto";
export { publicSearchInputSchema } from "@/lib/server/modules/search/schema";
export {
  publicSearchService,
  rebuildGlobalSearchProjection,
} from "@/lib/server/modules/search/service";
export type { PublicSearchResultDto } from "@/lib/server/modules/search/dto";
export type { PublicSearchInput } from "@/lib/server/modules/search/schema";
