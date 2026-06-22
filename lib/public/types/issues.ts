import type { RouterOutputs } from "@/lib/trpc/types";

export type PublicCurrentIssueDetail = RouterOutputs["public"]["issues"]["getCurrent"];

export type PublicIssueListItem =
  RouterOutputs["public"]["issues"]["listPublished"]["items"][number];
