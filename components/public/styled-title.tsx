import type { IssueTitleStyled } from "@/lib/server/modules/issues/schema";

type StyledTitleProps = {
  title: string;
  titleStyled?: IssueTitleStyled | null;
  className?: string;
  primaryClassName?: string;
};

const parseTitleMarkers = (title: string): IssueTitleStyled | null => {
  const segments: IssueTitleStyled = [];
  const markerPattern = /\[\[([^\]]+)\]\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = markerPattern.exec(title)) !== null) {
    const before = title.slice(cursor, match.index);
    if (before) {
      segments.push({ text: before, tone: "default" });
    }

    segments.push({ text: match[1], tone: "primary" });
    cursor = match.index + match[0].length;
  }

  const after = title.slice(cursor);
  if (after) {
    segments.push({ text: after, tone: "default" });
  }

  return segments.some((segment) => segment.tone === "primary") ? segments : null;
};

export function StyledTitle({
  title,
  titleStyled,
  className,
  primaryClassName = "text-accent",
}: StyledTitleProps) {
  const segments = titleStyled?.length
    ? titleStyled
    : (parseTitleMarkers(title) ?? [{ text: title, tone: "default" as const }]);

  return (
    <span className={className}>
      {segments.map((segment, index) => (
        <span
          key={`${segment.text}-${index}`}
          className={segment.tone === "primary" ? primaryClassName : undefined}
        >
          {segment.text}
        </span>
      ))}
    </span>
  );
}
