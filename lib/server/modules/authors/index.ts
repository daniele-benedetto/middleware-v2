export {
  authorDetailDtoSchema,
  authorDtoSchema,
  authorsListDtoSchema,
} from "@/lib/server/modules/authors/dto";
export { authorsPolicy } from "@/lib/server/modules/authors/policy";
export { authorsRepository } from "@/lib/server/modules/authors/repository";
export {
  createAuthorInputSchema,
  listAuthorsQuerySchema,
  updateAuthorInputSchema,
} from "@/lib/server/modules/authors/schema";
export type {
  CreateAuthorInput,
  ListAuthorsQuery,
  UpdateAuthorInput,
} from "@/lib/server/modules/authors/schema";
export type { AuthorDetailDto, AuthorDto } from "@/lib/server/modules/authors/dto";
export { authorsService } from "@/lib/server/modules/authors/service";
