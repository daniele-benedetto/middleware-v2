import { z } from "zod";

import { issueTitleStyledSchema } from "@/lib/server/modules/issues/schema";
import { questionnaireHomeVariantSchema } from "@/lib/server/modules/questionnaires/schema";

/** Minimal public data of an open questionnaire, used by the issue home invite block. */
export const publicQuestionnaireInviteDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleStyled: issueTitleStyledSchema.nullable(),
  slug: z.string(),
  description: z.string().nullable(),
  homeVariant: questionnaireHomeVariantSchema,
  questionCount: z.number().int().nonnegative(),
  estimatedMinutes: z.number().int().min(1),
});

export type PublicQuestionnaireInviteDto = z.infer<typeof publicQuestionnaireInviteDtoSchema>;
