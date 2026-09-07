import { TrpcProvider } from "@/lib/trpc/provider";

import type { ReactNode } from "react";

export default function QuestionnaireLayout({ children }: { children: ReactNode }) {
  return <TrpcProvider>{children}</TrpcProvider>;
}
