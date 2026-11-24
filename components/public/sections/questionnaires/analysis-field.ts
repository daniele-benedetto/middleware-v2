import type {
  PublicQuestionnaireAnalysisFieldDto,
  QuestionnaireAnalysisFieldDto,
} from "@/lib/server/modules/questionnaires/dto/public";

export type AnalysisField = PublicQuestionnaireAnalysisFieldDto;
export type AnalysisTableField =
  | PublicQuestionnaireAnalysisFieldDto
  | QuestionnaireAnalysisFieldDto;
