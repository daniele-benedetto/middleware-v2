import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { composePrintEdition } from "@/lib/print/compose-edition";
import { applyPrintEditionOverrides, buildPrintEditionManifest } from "@/lib/print/issue-manifest";
import { assertPrintEditionTransition } from "@/lib/print/workflow";
import { prisma } from "@/lib/prisma";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { ApiError } from "@/lib/server/http/api-error";
import { printEditionsRepository } from "@/lib/server/modules/print-editions/repository";

import type {
  CreatePrintEditionInput,
  PrintEditionListQuery,
  UpdatePrintEditionInput,
} from "@/lib/server/modules/print-editions/schema";

function toDto(value: Awaited<ReturnType<typeof printEditionsRepository.getById>>) {
  if (!value) return null;
  return {
    id: value.id,
    issueId: value.issueId,
    title: value.title,
    status: value.status,
    manifest: value.manifest,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

async function assertServerPreflightReady(
  edition: NonNullable<Awaited<ReturnType<typeof printEditionsRepository.getById>>>,
) {
  const issue = await prisma.issue.findUnique({
    where: { id: edition.issueId },
    select: {
      id: true,
      title: true,
      homeBlocks: true,
      articles: {
        where: { status: "PUBLISHED", publishedAt: { not: null } },
        select: {
          id: true,
          title: true,
          contentRich: true,
          excerpt: true,
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!issue) throw new ApiError(409, "CONFLICT", "L’issue collegato non esiste più.");

  const rawBlocks = Array.isArray(issue.homeBlocks) ? issue.homeBlocks : [];
  const specialBlock = rawBlocks.find(
    (block) =>
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      ((block as { type?: unknown }).type === "map" ||
        (block as { type?: unknown }).type === "questionnaireAnalysis"),
  );
  if (specialBlock) {
    throw new ApiError(
      409,
      "CONFLICT",
      "L’issue contiene mappe o analisi senza un asset statico di stampa approvato.",
    );
  }

  const articles = issue.articles.map((article) => ({
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    authorName: article.author?.name ?? null,
    contentRich: article.contentRich,
    readingTimeMinutes: Math.max(
      1,
      Math.ceil(
        ((extractPlainText(article.contentRich) ?? "").split(/\s+/).filter(Boolean).length || 1) /
          220,
      ),
    ),
  }));
  const sourceBlocks = rawBlocks.flatMap((block) => {
    if (!block || typeof block !== "object" || !("type" in block)) return [];
    const typed = block as Record<string, unknown>;
    if (
      ["opening", "body", "rupture", "closing"].includes(String(typed.type)) &&
      Array.isArray(typed.articleIds)
    ) {
      return [
        {
          type: typed.type as "opening" | "body" | "rupture" | "closing",
          articleIds: typed.articleIds as string[],
        },
      ];
    }
    return [];
  });
  const manifestInput = edition.manifest as {
    title: string;
    issueNumber: string;
    overrides?: unknown[];
  };
  const baseManifest = buildPrintEditionManifest({
    issueId: issue.id,
    title: issue.title,
    issueNumber: manifestInput.issueNumber,
    articles,
    homeBlocks: sourceBlocks,
  });
  const manifest = applyPrintEditionOverrides(baseManifest, {
    overrides: Array.isArray(manifestInput.overrides) ? (manifestInput.overrides as never[]) : [],
  });
  const composition = composePrintEdition(manifest, articles);
  const blockingWarning = composition.warnings.find(
    (warning) => warning.includes("testo mancante") || warning.includes("non disponibile"),
  );
  if (blockingWarning) {
    throw new ApiError(409, "CONFLICT", `Preflight bloccante: ${blockingWarning}`);
  }
}

export const printEditionsService = {
  async list(query: PrintEditionListQuery) {
    const items = await printEditionsRepository.list({
      ...(query.issueId ? { issueId: query.issueId } : {}),
      ...(query.status ? { status: query.status } : {}),
    });
    return items.map((item) => toDto(item)!);
  },
  async getById(id: string) {
    const edition = toDto(await printEditionsRepository.getById(id));
    if (!edition) throw new ApiError(404, "NOT_FOUND", "Print edition not found");
    return edition;
  },
  async create(input: CreatePrintEditionInput) {
    const created = await printEditionsRepository.create({
      title: input.title,
      status: "DRAFT",
      manifest: input.manifest,
      issue: { connect: { id: input.issueId } },
    });
    return toDto(created)!;
  },
  async update(input: UpdatePrintEditionInput) {
    const current = await printEditionsRepository.getById(input.id);
    if (!current) throw new ApiError(404, "NOT_FOUND", "Print edition not found");
    if (input.status) {
      assertPrintEditionTransition(current.status, input.status);
      if (input.status === "APPROVED" || input.status === "EXPORTED") {
        await assertServerPreflightReady(current);
      }
    }
    if (current.status === "EXPORTED" && (input.title || input.manifest)) {
      throw new ApiError(409, "CONFLICT", "Un’edizione esportata non può più essere modificata.");
    }
    const updated = await printEditionsRepository.update(input.id, {
      ...(input.title ? { title: input.title } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.manifest ? { manifest: input.manifest } : {}),
    });
    return toDto(updated)!;
  },
  async duplicate(id: string) {
    const source = await printEditionsRepository.getById(id);
    if (!source) throw new ApiError(404, "NOT_FOUND", "Print edition not found");
    const created = await printEditionsRepository.create({
      issue: { connect: { id: source.issueId } },
      title: `${source.title} / copia`,
      status: "DRAFT",
      manifest: source.manifest as Prisma.InputJsonValue,
    });
    return toDto(created)!;
  },
  async delete(id: string) {
    const source = await printEditionsRepository.getById(id);
    if (!source) throw new ApiError(404, "NOT_FOUND", "Print edition not found");
    await printEditionsRepository.delete(id);
    return { success: true as const };
  },
};
