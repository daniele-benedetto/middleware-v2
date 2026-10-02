import { PrintFooterQr } from "@/components/cms/print/print-footer-qr";
import { PrintRichText } from "@/components/cms/print/print-rich-text";
import { PrintTextRuns } from "@/components/cms/print/print-text-runs";
import { PrintTitle } from "@/components/cms/print/print-title";

import type { PrintCourseLesson, PrintCourseSection } from "@/lib/print/issue-document";

function CourseLesson({ lesson }: { lesson: PrintCourseLesson }) {
  return (
    <section className="course__lesson">
      <div className="course__lesson-header">
        <span className="course__lesson-number">{lesson.label}</span>
        <h3 className="course__lesson-title">{lesson.title}</h3>
      </div>
      <div className="course__lesson-text" data-print-fit-box="">
        {lesson.lead.length > 0 ? (
          <p className="course__lesson-lead">
            <PrintTextRuns runs={lesson.lead} />
          </p>
        ) : null}
        <PrintRichText value={lesson.content} />
      </div>
    </section>
  );
}

/**
 * Two page-sized boxes, as in the mockup: the first meeting fills the opening
 * page under the course header, the others share the second page in equal
 * heights and the footer QR closes it. The viewer trims each meeting to fill
 * its box (`data-print-fit-box`).
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
    <PrintFooterQr
      qrCode={qrCode}
      label="Leggi tutti gli incontri su"
      siteLabel={siteLabel}
      alt={`QR code: ${course.plainTitle}`}
    />
  ) : null;

  return (
    <section
      id={course.anchor}
      className="course"
      data-print-anchor={course.anchor}
      data-print-label={course.label}
      data-print-end-logo={course.showEndLogo ? "" : undefined}
    >
      <div className={`course__page${rest.length === 0 ? " course__page--with-service" : ""}`}>
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
        <div className="course__page course__page--rest course__page--with-service">
          {rest.map((lesson) => (
            <CourseLesson key={lesson.id} lesson={lesson} />
          ))}
          {service}
        </div>
      ) : null}
    </section>
  );
}
