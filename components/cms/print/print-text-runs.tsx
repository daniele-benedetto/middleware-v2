import type { PrintTextRun } from "@/lib/print/rich-excerpt";

export function PrintTextRuns({ runs }: { runs: PrintTextRun[] }) {
  return runs.map((run, index) => {
    const text = run.italic ? <em>{run.text}</em> : run.text;
    return run.bold ? <strong key={index}>{text}</strong> : <span key={index}>{text}</span>;
  });
}
