import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { ApiError } from "@/lib/server/http/api-error";
import { publicQuestionnairesService } from "@/lib/server/modules/questionnaires/service/public";

import type {
  PublicQuestionnaireAnalysisDto,
  PublicQuestionnaireDto,
} from "@/lib/server/modules/questionnaires/dto/public";

export const PUBLIC_QUESTIONNAIRE_PAGE_CACHE_TAG = "public-questionnaire";
export const PUBLIC_QUESTIONNAIRE_ANALYSIS_CACHE_TAG = "public-questionnaire-analysis";

export const PUBLIC_QUESTIONNAIRE_INVITE_CACHE_TAG = "public-questionnaire-invite";

export function getPublicQuestionnaireInviteCacheTag(questionnaireId: string) {
  return `${PUBLIC_QUESTIONNAIRE_INVITE_CACHE_TAG}:${questionnaireId}`;
}

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

/**
 * Results page data of a closed questionnaire; `null` when the questionnaire is not closed
 * or exposes no public results. The shared questionnaire tag covers the `null` case (the
 * id is unknown until the questionnaire closes), the per-questionnaire tag the found one.
 */
export async function getPublicQuestionnaireResultsPageData(
  slug: string,
): Promise<PublicQuestionnaireAnalysisDto | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_QUESTIONNAIRE_PAGE_CACHE_TAG);

  try {
    const analysis = await publicQuestionnairesService.getClosedAnalysisBySlug(slug);
    cacheTag(getPublicQuestionnaireAnalysisCacheTag(analysis.id));
    return analysis;
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") return null;
    throw error;
  }
}
