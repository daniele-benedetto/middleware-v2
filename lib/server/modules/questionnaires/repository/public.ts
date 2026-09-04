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
};
