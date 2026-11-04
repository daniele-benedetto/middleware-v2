import { protectPrintTitleCompounds } from "@/lib/print/title-compounds";

import type { PrintTitleSegment } from "@/lib/print/issue-document";

export function PrintTitle({
  as: Heading,
  className,
  segments,
}: {
  as: "h1" | "h2";
  className: string;
  segments: PrintTitleSegment[];
}) {
  return (
    <Heading className={className}>
      {segments.map((segment, index) => (
        <span key={`${segment.text}-${index}`} className={segment.accent ? "accent" : undefined}>
          {protectPrintTitleCompounds(segment.text)}
          {segment.breakAfter ? <br /> : null}
        </span>
      ))}
    </Heading>
  );
}
