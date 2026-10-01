import { z } from "zod";

export const printPdfLayoutSchema = z.enum(["pages", "booklet"]);

export type PrintPdfLayout = z.infer<typeof printPdfLayoutSchema>;
