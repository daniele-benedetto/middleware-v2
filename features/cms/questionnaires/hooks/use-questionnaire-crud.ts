"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateQuestionnaireInput = RouterInputs["questionnaires"]["create"];
type UpdateQuestionnaireInput = RouterInputs["questionnaires"]["update"]["data"];
type QuestionnaireDetail = RouterOutputs["questionnaires"]["getById"];

export function useQuestionnaireById(id?: string, options?: { initialData?: QuestionnaireDetail }) {
  return trpc.questionnaires.getById.useQuery(
    { id: id ?? "" },
    { enabled: Boolean(id), staleTime: 30_000, initialData: options?.initialData },
  );
}

export function useQuestionnaireCreate() {
  return trpc.questionnaires.create.useMutation();
}

export function useQuestionnaireUpdate() {
  return trpc.questionnaires.update.useMutation();
}

export type { CreateQuestionnaireInput, QuestionnaireDetail, UpdateQuestionnaireInput };
