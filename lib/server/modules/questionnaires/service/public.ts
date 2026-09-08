import "server-only";

import { ApiError } from "@/lib/server/http/api-error";
import { publicQuestionnairesRepository } from "@/lib/server/modules/questionnaires/repository/public";
import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema";
import { toPublicQuestionnaireAnalysis } from "@/lib/server/modules/questionnaires/service/analysis";

import type { PublicQuestionnaireDto } from "@/lib/server/modules/questionnaires/dto/public";

export const publicQuestionnairesService = {
  async getBySlug(slug: string): Promise<PublicQuestionnaireDto> {
    const questionnaire = await publicQuestionnairesRepository.getBySlug(slug);

    if (!questionnaire) {
      throw new ApiError(404, "NOT_FOUND", "Questionnaire not found");
    }

    const definition = questionnaireDefinitionSchema.safeParse(questionnaire.definition);
    if (!definition.success) {
      throw new ApiError(500, "INTERNAL_ERROR", "Questionnaire definition is invalid");
    }

    return {
      id: questionnaire.id,
      title: questionnaire.title,
      slug: questionnaire.slug,
      descriptionRich: questionnaire.descriptionRich,
      definition: definition.data,
      isClosed: questionnaire.status === "CLOSED",
    };
  },
  async getClosedAnalysesByIds(ids: string[]) {
    const records = await publicQuestionnairesRepository.getClosedAnalysesByIds(ids);
    return records
      .map(toPublicQuestionnaireAnalysis)
      .filter((analysis): analysis is NonNullable<typeof analysis> => analysis !== null);
  },
};
