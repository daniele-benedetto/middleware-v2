import { questionnaireDefinitionSchema } from "@/lib/server/modules/questionnaires/schema/definition";

type QuestionnaireDefinition = ReturnType<typeof questionnaireDefinitionSchema.parse>;
type QuestionnaireField = QuestionnaireDefinition["steps"][number]["fields"][number];

function fieldTexts(field: QuestionnaireField): Array<string | undefined> {
  const optionLabels =
    field.type === "singleChoice" || field.type === "multipleChoice"
      ? field.options.map((option) => option.label)
      : [];
  const consentText = field.type === "consent" ? field.consentText : undefined;

  return [field.label, field.description, consentText, ...optionLabels];
}

export function questionnaireSearchText(definition: unknown): string {
  const parsed = questionnaireDefinitionSchema.safeParse(definition);
  if (!parsed.success) return "";

  const { copy, steps } = parsed.data;
  const texts = [
    copy.introduction,
    ...steps.flatMap((step) => [step.title, step.description, ...step.fields.flatMap(fieldTexts)]),
  ];

  return texts
    .filter((text): text is string => Boolean(text))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
