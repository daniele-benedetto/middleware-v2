import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { ApiError } from "@/lib/server/http/api-error";
import { publicQuestionnairesService } from "@/lib/server/modules/questionnaires/service/public";

import type { PublicQuestionnaireDto } from "@/lib/server/modules/questionnaires/dto/public";

export const PUBLIC_QUESTIONNAIRE_PAGE_CACHE_TAG = "public-questionnaire";
export const PUBLIC_QUESTIONNAIRE_ANALYSIS_CACHE_TAG = "public-questionnaire-analysis";

export function getPublicQuestionnaireAnalysisCacheTag(questionnaireId: string) {
  return `${PUBLIC_QUESTIONNAIRE_ANALYSIS_CACHE_TAG}:${questionnaireId}`;
}

export async function getPublicQuestionnairePageData(
  slug: string,
): Promise<PublicQuestionnaireDto | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_QUESTIONNAIRE_PAGE_CACHE_TAG);

  try {
    return await publicQuestionnairesService.getBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") return null;
    throw error;
  }
}
