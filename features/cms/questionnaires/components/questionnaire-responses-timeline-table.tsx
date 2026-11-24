import { cmsTableClasses } from "@/components/cms/primitives";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { i18n } from "@/lib/i18n";

import type { RouterOutputs } from "@/lib/trpc/types";

type Timeline = RouterOutputs["questionnaires"]["getSummary"]["timeline"];

const text = i18n.cms.lists.questionnaires.responses.summary;

const dayFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const numberFormatter = new Intl.NumberFormat("it-IT");

function formatDay(dayKey: string) {
  return dayFormatter.format(new Date(`${dayKey}T00:00:00.000Z`));
}

export function QuestionnaireResponsesTimelineTable({ timeline }: { timeline: Timeline }) {
  const daysWithResponses = timeline.days.filter((day) => day.count > 0);

  return (
    <div className="cms-scroll max-h-96 overflow-auto border border-foreground">
      <Table className={cmsTableClasses.table} containerClassName={cmsTableClasses.tableContainer}>
        <TableCaption className="sr-only">{text.timelineCaption}</TableCaption>
        <TableHeader>
          <TableRow className={cmsTableClasses.headerRow}>
            <TableHead className={cmsTableClasses.headerCell}>{text.timelineDay}</TableHead>
            <TableHead className={`${cmsTableClasses.headerCell} text-right`}>
              {text.timelineDayResponses}
            </TableHead>
            <TableHead className={`${cmsTableClasses.headerCell} text-right`}>
              {text.timelineCumulative}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {daysWithResponses.map((day) => (
            <TableRow className={cmsTableClasses.bodyRow} key={day.date}>
              <TableCell className={cmsTableClasses.bodyCellMeta}>{formatDay(day.date)}</TableCell>
              <TableCell className={`${cmsTableClasses.bodyCellNumeric} tabular-nums`}>
                {numberFormatter.format(day.count)}
              </TableCell>
              <TableCell className={`${cmsTableClasses.bodyCellNumeric} tabular-nums`}>
                {numberFormatter.format(day.cumulative)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
