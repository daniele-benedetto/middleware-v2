type RichTextNode = { text?: unknown; marks?: unknown; content?: unknown };

const SPEAKER_LABEL = /^\s*\p{Lu}{1,3}\s*[:.]\s*$/u;

function hasMark(node: RichTextNode | undefined, type: string) {
  return (
    Array.isArray(node?.marks) &&
    node.marks.some((mark) => (mark as { type?: unknown } | null)?.type === type)
  );
}

/**
 * Interviews set questions as a bold speaker initial ("D:", "F:") followed by
 * italic text; answers keep the bold initial with roman text.
 */
export function isInterviewQuestion(paragraph: RichTextNode) {
  const children = Array.isArray(paragraph.content) ? (paragraph.content as RichTextNode[]) : [];
  const [label, ...rest] = children;
  const question = rest.filter((child) => typeof child.text === "string" && child.text.trim());

  return (
    typeof label?.text === "string" &&
    SPEAKER_LABEL.test(label.text) &&
    hasMark(label, "bold") &&
    question.length > 0 &&
    question.every((child) => hasMark(child, "italic"))
  );
}
