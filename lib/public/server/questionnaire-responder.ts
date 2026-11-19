import "server-only";

import { cookies } from "next/headers";

import {
  hashQuestionnaireResponderCookie,
  questionnaireResponderCookie,
} from "@/lib/server/http/questionnaire-responder-cookie";
import { questionnaireResponsesService } from "@/lib/server/modules/questionnaires/service";

export type QuestionnaireResponderStatus = {
  hasResponded: boolean;
  /**
   * False when the request carries no responder cookie. That normally means a first visit, but
   * cookies issued before they became site-wide are only sent to the API: the page then asks
   * the API once to be sure.
   */
  isKnown: boolean;
};

/**
 * Request-time: whether the visitor already answered the questionnaire, so the page can be
 * rendered on the server in its final state. Never throws: on any failure the page falls back
 * to asking the API from the browser.
 */
export async function getQuestionnaireResponderStatus(
  questionnaireId: string,
): Promise<QuestionnaireResponderStatus> {
  try {
    const cookieStore = await cookies();
    const tokenHash = hashQuestionnaireResponderCookie(
      cookieStore.get(questionnaireResponderCookie.name)?.value,
    );
    if (!tokenHash) return { hasResponded: false, isKnown: false };
    return {
      hasResponded: await questionnaireResponsesService.hasResponded(questionnaireId, tokenHash),
      isKnown: true,
    };
  } catch {
    return { hasResponded: false, isKnown: false };
  }
}
