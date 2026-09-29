import { z } from "zod";

import { printEditionSchema } from "@/lib/print/edition-schema";

export const printEditionDtoSchema = printEditionSchema;
export const printEditionsListDtoSchema = z.array(printEditionDtoSchema);
export type PrintEditionDto = z.infer<typeof printEditionDtoSchema>;
