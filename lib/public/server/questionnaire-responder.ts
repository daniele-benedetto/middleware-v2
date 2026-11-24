import "server-only";

import { cookies } from "next/headers";

import {
  hashQuestionnaireResponderCookie,
  questionnaireResponderCookie,
} from "@/lib/server/http/questionnaire-responder-cookie";
import { questionnaireResponsesService } from "@/lib/server/modules/questionnaires/service";

export type QuestionnaireResponderStatus = {
  hasResponded: boolean;
  isKnown: boolean;
};

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
