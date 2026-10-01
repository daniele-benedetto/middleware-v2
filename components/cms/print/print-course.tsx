import { PrintFooterQr } from "@/components/cms/print/print-footer-qr";
import { PrintTextRuns } from "@/components/cms/print/print-text-runs";
import { PrintTitle } from "@/components/cms/print/print-title";
import { PRINT_FIT_PAGES, type PrintCourseSection } from "@/lib/print/issue-document";

/**
 * The course fills its two pages: meetings run in one reading column with a side
 * column for number and title, and the viewer trims their text
 * (`data-print-fit-text`) until everything fits.
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
  const meetings = course.lessons.length === 1 ? "1 incontro" : `${course.lessons.length} incontri`;

  return (
    <section
      id={course.anchor}
      className="course"
      data-print-anchor={course.anchor}
      data-print-fit-pages={PRINT_FIT_PAGES}
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

      <div className="course__lessons">
        {course.lessons.map((lesson) => (
          <article className="course__lesson" key={lesson.id}>
            <div className="course__lesson-side">
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
        ))}

        {qrCode ? (
          <div className="print-footer-float">
            <PrintFooterQr
              qrCode={qrCode}
              label="Leggi tutti gli incontri su"
              siteLabel={siteLabel}
              alt={`QR code: ${course.plainTitle}`}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
