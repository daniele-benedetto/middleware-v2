import { CmsFormLabel } from "@/components/cms/primitives/form-controls";
import { cmsFieldErrorClass, cmsFieldHintClass } from "@/lib/cms/ui/variants";

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
      <CmsFormLabel htmlFor={htmlFor} state={error ? "error" : "default"}>
        {label}
        {required ? " *" : ""}
      </CmsFormLabel>
      <div className="ui-surface border border-border bg-background p-3">{children}</div>
      {error ? (
        <p className={cmsFieldErrorClass}>{error}</p>
      ) : hint ? (
        <p className={cmsFieldHintClass}>{hint}</p>
      ) : null}
    </div>
  );
}
