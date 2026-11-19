import "server-only";

import { ApiError } from "@/lib/server/http/api-error";
import { publicQuestionnairesRepository } from "@/lib/server/modules/questionnaires/repository/public";
import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema";
import { toPublicQuestionnaireAnalysis } from "@/lib/server/modules/questionnaires/service/analysis";
import { toPublicQuestionnaireInvite } from "@/lib/server/modules/questionnaires/service/invite";

import type {
  PublicQuestionnaireAnalysisDto,
  PublicQuestionnaireDto,
} from "@/lib/server/modules/questionnaires/dto/public";

type ClosedAnalysisRecord = NonNullable<
  Awaited<ReturnType<typeof publicQuestionnairesRepository.getClosedAnalysisBySlug>>
>;

/** Aggregated results plus what links to the results page: slug and number of responses. */
function toLinkedPublicAnalysis(
  record: ClosedAnalysisRecord,
): PublicQuestionnaireAnalysisDto | null {
  const analysis = toPublicQuestionnaireAnalysis(record);
  if (!analysis) return null;
  return { ...analysis, slug: record.slug, totalResponses: record._count.responses };
}

/**
 * Whether a questionnaire has a results page. Runs the analysis without responses so the
 * answer always matches what the results page itself would decide.
 */
function hasPublicResults(record: {
  id: string;
  title: string;
  descriptionRich: unknown;
  status: string;
  closedAt: Date | null;
  definition: unknown;
}) {
  if (record.status !== "CLOSED") return false;
  return toPublicQuestionnaireAnalysis({ ...record, responses: [] }) !== null;
}

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
      hasPublicResults: hasPublicResults(questionnaire),
    };
  },
  async getClosedAnalysesByIds(ids: string[]) {
    const records = await publicQuestionnairesRepository.getClosedAnalysesByIds(ids);
    return records
      .map(toLinkedPublicAnalysis)
      .filter((analysis): analysis is NonNullable<typeof analysis> => analysis !== null);
  },
  /** Results of a closed questionnaire with at least one public-result field, else 404. */
  async getClosedAnalysisBySlug(slug: string): Promise<PublicQuestionnaireAnalysisDto> {
    const record = await publicQuestionnairesRepository.getClosedAnalysisBySlug(slug);
    const analysis = record ? toLinkedPublicAnalysis(record) : null;
    if (!analysis) {
      throw new ApiError(404, "NOT_FOUND", "Questionnaire results not found");
    }
    return analysis;
  },
  async getOpenInvitesByIds(ids: string[]) {
    const records = await publicQuestionnairesRepository.getOpenInvitesByIds(ids);
    return records
      .map(toPublicQuestionnaireInvite)
      .filter((invite): invite is NonNullable<typeof invite> => invite !== null);
  },
};
