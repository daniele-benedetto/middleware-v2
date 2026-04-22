export { tagDtoSchema, tagsListDtoSchema } from "@/lib/server/modules/tags/dto";
export { tagsPolicy } from "@/lib/server/modules/tags/policy";
export { tagsRepository } from "@/lib/server/modules/tags/repository";
export { createTagInputSchema, updateTagInputSchema } from "@/lib/server/modules/tags/schema";
export type { CreateTagInput, UpdateTagInput } from "@/lib/server/modules/tags/schema";
export type { TagDto } from "@/lib/server/modules/tags/dto";
export { tagsService } from "@/lib/server/modules/tags/service";
