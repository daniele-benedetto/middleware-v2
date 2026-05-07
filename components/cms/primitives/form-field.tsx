import { CmsFormLabel } from "@/components/cms/primitives/form-controls";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type CmsFormFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function CmsFormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
}: CmsFormFieldProps) {
  return (
    <div className={cn(className)}>
      <CmsFormLabel htmlFor={htmlFor} state={error ? "error" : "default"}>
        {label}
        {required ? " *" : ""}
      </CmsFormLabel>
      {children}
      {error ? (
        <p className="mt-1.25 font-ui text-[10px] uppercase tracking-[0.04em] text-accent">
          {"\u2691 "}
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.25 font-ui text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
