import { i18n } from "@/lib/i18n";

import type {
  QuestionnaireDescribedRuleDto,
  QuestionnaireFieldAudienceDto,
} from "@/lib/server/modules/questionnaires/dto/public";

type DescribedCondition = QuestionnaireDescribedRuleDto["conditions"][number];

const text = i18n.public.questionnaireRules;
const numberFormatter = new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 20 });
const dateTimeFormatter = new Intl.DateTimeFormat(i18n.locale, {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Rome",
});

function formatValue(kind: DescribedCondition["valueKind"], value: string | number) {
  if (typeof value === "number") return numberFormatter.format(value);
  if (kind === "date") {
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
  }
  if (kind === "datetime") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
  }
  return text.quoted(value);
}

function getOperatorLabel(condition: DescribedCondition) {
  const isDate = condition.valueKind === "date" || condition.valueKind === "datetime";
  const dateLabel = isDate
    ? (text.dateOperators as Partial<Record<DescribedCondition["operator"], string>>)[
        condition.operator
      ]
    : undefined;
  return dateLabel ?? text.operators[condition.operator];
}

export function formatQuestionnaireCondition(condition: DescribedCondition): string {
  const subject = text.quoted(condition.fieldLabel);
  if (condition.valueKind === "consent") {
    const given = condition.values[0] === 1;
    const positive = condition.operator === "notEquals" ? !given : given;
    return `${subject} ${positive ? text.consentGiven : text.consentNotGiven}`;
  }

  const values = condition.values.map((value) => formatValue(condition.valueKind, value));
  const operator = getOperatorLabel(condition);
  if (values.length === 0) return `${subject} ${operator}`;
  const separator = condition.operator === "between" ? text.rangeSeparator : text.listSeparator;
  return `${subject} ${operator} ${values.join(separator)}`;
}

export function formatQuestionnaireRule(rule: QuestionnaireDescribedRuleDto): string {
  return rule.conditions
    .map(formatQuestionnaireCondition)
    .join(rule.match === "any" ? text.matchAny : text.matchAll);
}

export function formatQuestionnaireAudience(audience: QuestionnaireFieldAudienceDto): {
  shown: string;
  condition: string | null;
} {
  const describe = (rules: QuestionnaireDescribedRuleDto[] | undefined) =>
    (rules ?? []).filter((rule) => rule.conditions.length > 0).map(formatQuestionnaireRule);
  const parts = [
    ...(audience.rules.length > 0
      ? [text.audienceRule(describe(audience.rules).join(text.audienceRulesSeparator))]
      : []),
    ...describe(audience.endRules).map(text.audienceEndRule),
  ];
  return {
    shown: text.audience(
      numberFormatter.format(audience.shownCount),
      numberFormatter.format(audience.totalCount),
    ),
    condition: parts.length > 0 ? parts.join(text.audiencePartsSeparator) : null,
  };
}
