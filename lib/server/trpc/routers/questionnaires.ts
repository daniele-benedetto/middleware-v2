import "server-only";
import { z } from "zod";

import {
  questionnaireDetailDtoSchema,
  questionnaireDtoSchema,
  questionnaireResponseDetailDtoSchema,
  questionnaireResponsesCsvDtoSchema,
  questionnaireResponsesListDtoSchema,
  questionnairesListDtoSchema,
} from "@/lib/server/modules/questionnaires/dto";
import { questionnairesPolicy } from "@/lib/server/modules/questionnaires/policy";
import {
  createQuestionnaireInputSchema,
  listQuestionnairesQuerySchema,
  updateQuestionnaireInputSchema,
} from "@/lib/server/modules/questionnaires/schema";
import { cmsQuestionnairesService } from "@/lib/server/modules/questionnaires/service/cms";
import { router } from "@/lib/server/trpc/init";
import { auditMiddleware } from "@/lib/server/trpc/middlewares/audit";
import { requireRoleMiddleware } from "@/lib/server/trpc/middlewares/require-role";
import {
  protectedProcedure,
  publishProcedure,
  sensitiveWriteProcedure,
  writeProcedure,
} from "@/lib/server/trpc/procedures";
import { paginationInputSchema } from "@/lib/server/trpc/schemas/pagination";
import { successOutputSchema } from "@/lib/server/trpc/schemas/result";
import { parseOutput } from "@/lib/server/validation/output";

const id = z.object({ id: z.string().uuid() });
const listInput = paginationInputSchema.extend({
  query: listQuestionnairesQuerySchema.default({ sortBy: "updatedAt", sortOrder: "desc" }),
});
const responseListInput = paginationInputSchema.extend({ questionnaireId: z.string().uuid() });
const role = requireRoleMiddleware(questionnairesPolicy.allowedRoles);
const resultsRole = requireRoleMiddleware(questionnairesPolicy.resultsRoles);
export const questionnairesRouter = router({
  list: protectedProcedure
    .use(role)
    .input(listInput)
    .query(async ({ input }) => {
      const result = await cmsQuestionnairesService.list(input.query, input);
      return {
        items: parseOutput(result.items, questionnairesListDtoSchema),
        pagination: { page: input.page, pageSize: input.pageSize, total: result.total },
      };
    }),
  getById: protectedProcedure
    .use(role)
    .input(id)
    .query(({ input }) =>
      cmsQuestionnairesService
        .getById(input.id)
        .then((x) => parseOutput(x, questionnaireDetailDtoSchema)),
    ),
  create: writeProcedure
    .use(role)
    .use(auditMiddleware(() => ({ action: "create", resource: "questionnaires" })))
    .input(createQuestionnaireInputSchema)
    .mutation(async ({ input }) =>
      parseOutput(await cmsQuestionnairesService.create(input), questionnaireDetailDtoSchema),
    ),
  update: writeProcedure
    .use(role)
    .input(id.extend({ data: updateQuestionnaireInputSchema }))
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "update",
        resource: "questionnaires",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) =>
      parseOutput(
        await cmsQuestionnairesService.update(input.id, input.data),
        questionnaireDetailDtoSchema,
      ),
    ),
  publish: publishProcedure
    .use(role)
    .input(id)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "publish",
        resource: "questionnaires",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) =>
      parseOutput(
        await cmsQuestionnairesService.transition(input.id, "publish"),
        questionnaireDtoSchema,
      ),
    ),
  close: writeProcedure
    .use(role)
    .input(id)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "close",
        resource: "questionnaires",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) =>
      parseOutput(
        await cmsQuestionnairesService.transition(input.id, "close"),
        questionnaireDtoSchema,
      ),
    ),
  archive: writeProcedure
    .use(role)
    .input(id)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "archive",
        resource: "questionnaires",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) =>
      parseOutput(
        await cmsQuestionnairesService.transition(input.id, "archive"),
        questionnaireDtoSchema,
      ),
    ),
  restore: writeProcedure
    .use(role)
    .input(id)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "restore",
        resource: "questionnaires",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) =>
      parseOutput(
        await cmsQuestionnairesService.transition(input.id, "restore"),
        questionnaireDtoSchema,
      ),
    ),
  delete: sensitiveWriteProcedure
    .use(role)
    .input(id)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "delete",
        resource: "questionnaires",
        resourceId: input.id,
      })),
    )
    .mutation(async ({ input }) => {
      await cmsQuestionnairesService.delete(input.id);
      return parseOutput({ success: true }, successOutputSchema);
    }),
  listResponses: protectedProcedure
    .use(resultsRole)
    .input(responseListInput)
    .query(async ({ input }) => {
      const result = await cmsQuestionnairesService.listResponses(input.questionnaireId, input);
      return {
        items: parseOutput(result.items, questionnaireResponsesListDtoSchema),
        pagination: { page: input.page, pageSize: input.pageSize, total: result.total },
      };
    }),
  getResponseById: protectedProcedure
    .use(resultsRole)
    .input(id.extend({ questionnaireId: z.string().uuid() }))
    .query(({ input }) =>
      cmsQuestionnairesService
        .getResponseById(input.id, input.questionnaireId)
        .then((x) => parseOutput(x, questionnaireResponseDetailDtoSchema)),
    ),
  exportResponsesCsv: protectedProcedure
    .use(resultsRole)
    .input(id)
    .use(
      auditMiddleware<{ id: string }>((input) => ({
        action: "export",
        resource: "questionnaires",
        resourceId: input.id,
      })),
    )
    .query(({ input }) =>
      cmsQuestionnairesService
        .exportResponsesCsv(input.id)
        .then((x) => parseOutput(x, questionnaireResponsesCsvDtoSchema)),
    ),
});
