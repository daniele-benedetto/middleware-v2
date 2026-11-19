import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PUBLIC_QUESTIONNAIRE_SELECT = {
  id: true,
  title: true,
  slug: true,
  descriptionRich: true,
  definition: true,
  status: true,
  closedAt: true,
} as const satisfies Prisma.QuestionnaireSelect;

const PUBLIC_QUESTIONNAIRE_ANALYSIS_SELECT = {
  id: true,
  slug: true,
  title: true,
  titleStyled: true,
  homeVariant: true,
  descriptionRich: true,
  closedAt: true,
  definition: true,
  _count: { select: { responses: true } },
  responses: { select: { answers: true } },
} as const satisfies Prisma.QuestionnaireSelect;

const PUBLIC_QUESTIONNAIRE_INVITE_SELECT = {
  id: true,
  title: true,
  titleStyled: true,
  slug: true,
  descriptionRich: true,
  homeVariant: true,
  definition: true,
  status: true,
} as const satisfies Prisma.QuestionnaireSelect;

export const publicQuestionnairesRepository = {
  async getBySlug(slug: string) {
    return prisma.questionnaire.findFirst({
      where: {
        slug,
        status: { in: ["PUBLISHED", "CLOSED"] },
      },
      select: PUBLIC_QUESTIONNAIRE_SELECT,
    });
  },
  async getClosedAnalysesByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return prisma.questionnaire.findMany({
      where: { id: { in: ids }, status: "CLOSED" },
      select: PUBLIC_QUESTIONNAIRE_ANALYSIS_SELECT,
    });
  },
  async getClosedAnalysisBySlug(slug: string) {
    return prisma.questionnaire.findFirst({
      where: { slug, status: "CLOSED" },
      select: PUBLIC_QUESTIONNAIRE_ANALYSIS_SELECT,
    });
  },
  async getOpenInvitesByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return prisma.questionnaire.findMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
      select: PUBLIC_QUESTIONNAIRE_INVITE_SELECT,
    });
  },
};
