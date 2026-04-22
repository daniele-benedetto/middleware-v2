import type { ReactNode } from "react";

type CmsFormFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function CmsFormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
}: CmsFormFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="font-ui text-xs uppercase tracking-[0.08em] text-[#0A0A0A]"
      >
        {label}
        {required ? " *" : ""}
      </label>
      <div className="ui-surface border border-[rgba(10,10,10,0.3)] bg-[#F0E8D8] p-3">
        {children}
      </div>
      {error ? (
        <p className="font-ui text-xs uppercase tracking-[0.06em] text-[#C8001A]">{error}</p>
      ) : hint ? (
        <p className="text-sm text-[rgba(10,10,10,0.6)]">{hint}</p>
      ) : null}
    </div>
  );
}
