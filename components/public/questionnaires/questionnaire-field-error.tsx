export function QuestionnaireFieldError({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={id}
      className="mt-3 font-ui text-[11px] font-bold tracking-[0.06em] text-accent uppercase"
    >
      {message}
    </p>
  );
}
