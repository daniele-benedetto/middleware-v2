import { PrintFooterQr } from "@/components/cms/print/print-footer-qr";
import { PrintTextRuns } from "@/components/cms/print/print-text-runs";
import { PrintTitle } from "@/components/cms/print/print-title";

import type { PrintCourseLesson, PrintCourseSection } from "@/lib/print/issue-document";

function CourseLesson({ lesson }: { lesson: PrintCourseLesson }) {
  return (
    <article className="course__lesson">
      <div className="course__lesson-header">
        <span className="course__lesson-number">{lesson.label}</span>
        <h3 className="course__lesson-title">{lesson.title}</h3>
      </div>
      <p className="course__lesson-text" data-print-fit-text="">
        {lesson.lead.length > 0 ? (
          <em>
            <PrintTextRuns runs={lesson.lead} />{" "}
          </em>
        ) : null}
        <PrintTextRuns runs={lesson.text} />
      </p>
    </article>
  );
}

/**
 * Two pages: the first meeting fills the opening page under the course header,
 * the others share the second page and the QR closes it. Each page is fitted on
 * its own (`data-print-fit-pages`), so the viewer trims the meeting texts until
 * they fill their page.
 */
export function PrintCourse({
  course,
  qrCode,
  siteLabel,
}: {
  course: PrintCourseSection;
  qrCode: string | null;
  siteLabel: string;
}) {
  const [first, ...rest] = course.lessons;
  const meetings = course.lessons.length === 1 ? "1 incontro" : `${course.lessons.length} incontri`;
  const service = qrCode ? (
    <div className="print-footer-float">
      <PrintFooterQr
        qrCode={qrCode}
        label="Leggi tutti gli incontri su"
        siteLabel={siteLabel}
        alt={`QR code: ${course.plainTitle}`}
      />
    </div>
  ) : null;

  return (
    <section id={course.anchor} className="course" data-print-anchor={course.anchor}>
      <div
        className="course__page"
        data-print-anchor={`${course.anchor}-opening`}
        data-print-fit-pages={1}
      >
        <header className="course__header">
          <PrintTitle as="h2" className="course__title" segments={course.title} />
          {course.deck ? <p className="course__deck">{course.deck}</p> : null}
          <p className="article__meta">
            <span>{course.label}</span>
            <span className="article__meta-divider" aria-hidden="true" />
            <span>{meetings}</span>
          </p>
        </header>
        {first ? <CourseLesson lesson={first} /> : null}
        {rest.length === 0 ? service : null}
      </div>

      {rest.length > 0 ? (
        <div
          className="course__page course__page--rest"
          data-print-anchor={`${course.anchor}-rest`}
          data-print-fit-pages={1}
        >
          {rest.map((lesson) => (
            <CourseLesson key={lesson.id} lesson={lesson} />
          ))}
          {service}
        </div>
      ) : null}
    </section>
  );
}
