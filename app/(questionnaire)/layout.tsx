import { i18n } from "@/lib/i18n";
import { TrpcProvider } from "@/lib/trpc/provider";

import type { ReactNode } from "react";

export default function QuestionnaireLayout({ children }: { children: ReactNode }) {
  const text = i18n.public;

  return (
    <TrpcProvider>
      <div className="flex min-h-svh flex-1 flex-col bg-background font-heading text-foreground">
        <a
          href="#main-content"
          className="sr-only z-200 bg-foreground px-4 py-3 text-sm font-bold text-background uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-3 focus:outline-offset-2 focus:outline-accent"
        >
          {text.questionnaire.skipToQuestionnaire}
        </a>
        {children}
      </div>
    </TrpcProvider>
  );
}
