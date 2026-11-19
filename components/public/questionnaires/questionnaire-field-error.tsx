import { CircleAlert } from "lucide-react";

export function QuestionnaireFieldError({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={id}
      className="mt-2.5 flex items-start gap-2 font-heading text-[15px] leading-snug font-semibold text-accent"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
