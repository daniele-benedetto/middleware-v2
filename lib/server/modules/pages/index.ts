export {
  pageDetailDtoSchema,
  pageDtoSchema,
  pagesListDtoSchema,
} from "@/lib/server/modules/pages/dto";
export { pagesPolicy } from "@/lib/server/modules/pages/policy";
export { pagesRepository } from "@/lib/server/modules/pages/repository";
export {
  createPageInputSchema,
  listPagesQuerySchema,
  updatePageInputSchema,
} from "@/lib/server/modules/pages/schema";
export { pagesService } from "@/lib/server/modules/pages/service";
export type { PageDetailDto, PageDto } from "@/lib/server/modules/pages/dto";
export type {
  CreatePageInput,
  ListPagesQuery,
  UpdatePageInput,
} from "@/lib/server/modules/pages/schema";
