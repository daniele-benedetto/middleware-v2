import { z } from "zod";

export const publicQuestionnaireSlugInputSchema = z.object({
  slug: z.string().trim().min(1),
});

export const publicQuestionnaireIdInputSchema = z.object({
  questionnaireId: z.string().uuid(),
});

export const publicQuestionnaireSubmitInputSchema = publicQuestionnaireIdInputSchema.extend({
  answers: z.record(z.string(), z.unknown()),
});

export type PublicQuestionnaireSlugInput = z.infer<typeof publicQuestionnaireSlugInputSchema>;
export type PublicQuestionnaireIdInput = z.infer<typeof publicQuestionnaireIdInputSchema>;
export type PublicQuestionnaireSubmitInput = z.infer<typeof publicQuestionnaireSubmitInputSchema>;
