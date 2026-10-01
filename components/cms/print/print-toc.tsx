import { GraduationCap, Map as MapIcon, MessageCircle, Mic, Pencil, Search } from "lucide-react";

import type { PrintSection } from "@/lib/print/issue-document";

type TocIconKind = "editorial" | "contribution" | "interview" | "inquiry" | "map" | "course";

const categoryIcons: Record<string, TocIconKind> = {
  editoriale: "editorial",
  contributi: "contribution",
  interviste: "interview",
  approfondimenti: "inquiry",
};

function resolveTocIcon(section: PrintSection): TocIconKind {
  if (section.kind === "map") return "map";
  if (section.kind === "course") return "course";

  return (
    categoryIcons[section.label.toLowerCase()] ??
    (section.role === "rupture"
      ? "inquiry"
      : section.role === "body"
        ? "contribution"
        : "editorial")
  );
}

function TocIcon({ section }: { section: PrintSection }) {
  const props = { className: "toc__icon", "aria-hidden": true, strokeWidth: 2.5 } as const;

  switch (resolveTocIcon(section)) {
    case "map":
      return <MapIcon {...props} />;
    case "course":
      return <GraduationCap {...props} />;
    case "interview":
      return <Mic {...props} />;
    case "contribution":
      return <MessageCircle {...props} />;
    case "inquiry":
      return <Search {...props} />;
    case "editorial":
      return <Pencil {...props} />;
  }
}

export function PrintToc({ sections }: { sections: PrintSection[] }) {
  return (
    <nav className="toc" aria-label="Indice">
      <h2 className="toc__title">Indice</h2>
      {sections.length > 0 ? (
        <ol className="toc__list">
          {sections.map((section) => (
            <li className="toc__entry" key={section.anchor}>
              <TocIcon section={section} />
              <span className="toc__entry-title">{section.plainTitle}</span>
              <span className="toc__entry-page" data-print-ref={section.anchor} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="toc__empty">Nessun contenuto assegnato al numero.</p>
      )}
    </nav>
  );
}
