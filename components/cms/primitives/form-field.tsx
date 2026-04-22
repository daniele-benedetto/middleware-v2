import { CmsFormLabel } from "@/components/cms/primitives/form-controls";

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
    <div>
      <CmsFormLabel htmlFor={htmlFor} state={error ? "error" : "default"}>
        {label}
        {required ? " *" : ""}
      </CmsFormLabel>
      {children}
      {error ? (
        <p className="mt-[5px] font-ui text-[10px] uppercase tracking-[0.04em] text-accent">
          {"\u2691 "}
          {error}
        </p>
      ) : hint ? (
        <p className="mt-[5px] font-ui text-[10px] uppercase tracking-[0.04em] text-[color:var(--ink-60)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
