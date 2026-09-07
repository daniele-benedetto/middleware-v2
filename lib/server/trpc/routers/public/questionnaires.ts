import "server-only";

import { ensureQuestionnaireResponder } from "@/lib/server/http/questionnaire-responder-cookie";
import {
  publicQuestionnaireDtoSchema,
  publicQuestionnaireResponderDtoSchema,
  publicQuestionnaireSubmitDtoSchema,
} from "@/lib/server/modules/questionnaires/dto/public";
import {
  publicQuestionnaireSlugInputSchema,
  publicQuestionnaireSubmitInputSchema,
} from "@/lib/server/modules/questionnaires/schema/public";
import { questionnaireResponsesService } from "@/lib/server/modules/questionnaires/service";
import { publicQuestionnairesService } from "@/lib/server/modules/questionnaires/service/public";
import { router } from "@/lib/server/trpc/init";
import {
  publicQuestionnaireSubmitProcedure,
  publicReadProcedure,
  publicResponderProcedure,
} from "@/lib/server/trpc/procedures";
import { parseOutput } from "@/lib/server/validation/output";

export const publicQuestionnairesRouter = router({
  getBySlug: publicReadProcedure
    .input(publicQuestionnaireSlugInputSchema)
    .query(async ({ input }) => {
      return parseOutput(
        await publicQuestionnairesService.getBySlug(input.slug),
        publicQuestionnaireDtoSchema,
      );
    }),
  initializeResponder: publicResponderProcedure.mutation(({ ctx }) => {
    ensureQuestionnaireResponder(ctx.request, ctx.responseHeaders);
    return parseOutput({ initialized: true }, publicQuestionnaireResponderDtoSchema);
  }),
  submit: publicQuestionnaireSubmitProcedure
    .input(publicQuestionnaireSubmitInputSchema)
    .mutation(async ({ ctx, input }) => {
      const responder = ensureQuestionnaireResponder(ctx.request, ctx.responseHeaders);
      return parseOutput(
        await questionnaireResponsesService.submit({
          questionnaireId: input.questionnaireId,
          anonymousTokenHash: responder.tokenHash,
          answers: input.answers,
        }),
        publicQuestionnaireSubmitDtoSchema,
      );
    }),
});
