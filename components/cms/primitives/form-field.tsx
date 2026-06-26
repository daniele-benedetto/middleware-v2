import { Children, cloneElement, isValidElement } from "react";

import { CmsFormLabel } from "@/components/cms/primitives/form-controls";
import { cn } from "@/lib/utils";

import type { ReactElement, ReactNode } from "react";

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
  const messageId = error || hint ? `${htmlFor}-${error ? "error" : "hint"}` : undefined;
  const resolvedChildren = (() => {
    if (!messageId || Children.count(children) !== 1 || !isValidElement(children)) {
      return children;
    }

    const child = children as ReactElement<Record<string, unknown>>;
    const currentDescribedBy = child.props["aria-describedby"];
    const ariaDescribedBy =
      typeof currentDescribedBy === "string" ? `${currentDescribedBy} ${messageId}` : messageId;

    return cloneElement(child, {
      "aria-describedby": ariaDescribedBy,
      ...(error ? { "aria-invalid": true } : {}),
    });
  })();

  return (
    <div className={cn(className)}>
      <CmsFormLabel htmlFor={htmlFor} state={error ? "error" : "default"}>
        {label}
        {required ? " *" : ""}
      </CmsFormLabel>
      {resolvedChildren}
      {error ? (
        <p
          id={messageId}
          className="mt-1.25 font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-accent"
        >
          {"\u2691 "}
          {error}
        </p>
      ) : hint ? (
        <p
          id={messageId}
          className="mt-1.25 font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
