"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type CmsControlState = "default" | "focus" | "filled" | "error" | "disabled";

const cmsFormLabelVariants = cva("font-ui text-[10px] uppercase tracking-[0.08em]", {
  variants: {
    state: {
      default: "text-muted-foreground",
      focus: "text-accent",
      filled: "text-muted-foreground",
      error: "text-muted-foreground",
      disabled: "text-border",
    },
  },
  defaultVariants: {
    state: "default",
  },
});

const cmsTextInputVariants = cva(
  "h-11 rounded-none px-3 font-editorial text-[16px] leading-[1.55] transition-none placeholder:text-muted-foreground focus-visible:border-2 focus-visible:border-accent focus-visible:ring-0",
  {
    variants: {
      state: {
        default: "border-foreground bg-white text-foreground",
        focus: "border-2 border-accent bg-white text-foreground",
        filled: "border-foreground bg-background text-foreground",
        error: "border-2 border-accent bg-[color:var(--ui-error-bg)] text-foreground",
        disabled: "border-border bg-secondary text-border opacity-100",
      },
      tone: {
        editorial: "font-editorial text-[16px]",
        ui: "font-ui text-[12px] uppercase tracking-[0.04em]",
        mono: "font-ui text-[13px] tracking-[0.02em]",
      },
    },
    defaultVariants: {
      state: "default",
      tone: "editorial",
    },
  },
);

const cmsTextareaVariants = cva(
  "min-h-24 rounded-none px-3 py-2 font-editorial text-[16px] leading-[1.6] transition-none placeholder:text-muted-foreground focus-visible:border-2 focus-visible:border-accent focus-visible:ring-0",
  {
    variants: {
      state: {
        default: "border-foreground bg-white text-foreground",
        focus: "border-2 border-accent bg-white text-foreground",
        filled: "border-foreground bg-background text-foreground",
        error: "border-2 border-accent bg-[color:var(--ui-error-bg)] text-foreground",
        disabled: "border-border bg-secondary text-border opacity-100",
      },
    },
    defaultVariants: {
      state: "default",
    },
  },
);

const cmsSelectTriggerVariants = cva(
  "h-11 w-full rounded-none px-3 font-ui text-[12px] uppercase tracking-[0.04em] transition-none focus-visible:border-2 focus-visible:border-accent focus-visible:ring-0",
  {
    variants: {
      state: {
        default: "border-foreground bg-white text-foreground",
        focus: "border-2 border-accent bg-white text-foreground",
        filled: "border-foreground bg-background text-foreground",
        error: "border-2 border-accent bg-[color:var(--ui-error-bg)] text-foreground",
        disabled: "border-border bg-secondary text-border opacity-100",
      },
    },
    defaultVariants: {
      state: "default",
    },
  },
);

const cmsCheckboxBoxVariants = cva("inline-flex size-5 items-center justify-center border", {
  variants: {
    state: {
      unchecked: "border-foreground bg-white",
      checked: "border-foreground bg-foreground",
      checkedAccent: "border-accent bg-accent",
      disabled: "border-border bg-secondary",
    },
  },
  defaultVariants: {
    state: "unchecked",
  },
});

const cmsRadioBoxVariants = cva(
  "inline-flex size-5 items-center justify-center border rounded-full",
  {
    variants: {
      state: {
        unchecked: "border-border bg-white",
        checked: "border-2 border-accent bg-white",
        disabled: "border-border bg-secondary",
      },
    },
    defaultVariants: {
      state: "unchecked",
    },
  },
);

const cmsToggleTrackVariants = cva("relative inline-flex h-6 w-11 border rounded-none", {
  variants: {
    state: {
      off: "border-border bg-secondary",
      onInk: "border-foreground bg-foreground",
      onAccent: "border-accent bg-accent",
    },
  },
  defaultVariants: {
    state: "off",
  },
});

type CmsFormLabelProps = {
  children: ReactNode;
  htmlFor: string;
  className?: string;
} & VariantProps<typeof cmsFormLabelVariants>;

export function CmsFormLabel({ children, htmlFor, className, state }: CmsFormLabelProps) {
  return (
    <label htmlFor={htmlFor} className={cn(cmsFormLabelVariants({ state }), className)}>
      {children}
    </label>
  );
}

type CmsTextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof cmsTextInputVariants>;

export function CmsTextInput({ className, state, tone, disabled, ...props }: CmsTextInputProps) {
  const resolvedState: CmsControlState = disabled ? "disabled" : (state ?? "default");

  return (
    <Input
      disabled={disabled}
      className={cn(cmsTextInputVariants({ state: resolvedState, tone }), className)}
      {...props}
    />
  );
}

type CmsTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof cmsTextareaVariants>;

export function CmsTextarea({ className, state, disabled, ...props }: CmsTextareaProps) {
  const resolvedState: CmsControlState = disabled ? "disabled" : (state ?? "default");

  return (
    <Textarea
      disabled={disabled}
      className={cn(cmsTextareaVariants({ state: resolvedState }), className)}
      {...props}
    />
  );
}

type CmsSelectProps = {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  options: Array<{ value: string; label: string }>;
} & VariantProps<typeof cmsSelectTriggerVariants>;

export function CmsSelect({
  value,
  defaultValue,
  placeholder = "- SELEZIONA -",
  disabled,
  state,
  onValueChange,
  options,
}: CmsSelectProps) {
  const resolvedState: CmsControlState = disabled ? "disabled" : (state ?? "default");

  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(nextValue) => {
        if (nextValue != null) {
          onValueChange?.(nextValue);
        }
      }}
    >
      <SelectPrimitive.Trigger
        disabled={disabled}
        className={cn(
          cmsSelectTriggerVariants({ state: resolvedState }),
          "flex items-center justify-between",
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} className="truncate" />
        <SelectPrimitive.Icon render={<ChevronDownIcon className="size-4 text-foreground" />} />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner side="bottom" sideOffset={4} className="z-50">
          <SelectPrimitive.Popup className="w-(--anchor-width) border-2 border-accent bg-white">
            <SelectPrimitive.List>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative px-3 py-2 font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground outline-none focus:bg-accent focus:text-primary-foreground"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-3">
                    <CheckIcon className="size-3" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

type CmsCheckboxState = "unchecked" | "checked" | "checkedAccent" | "disabled";

type CmsCheckboxProps = {
  label: string;
  checked?: boolean;
  disabled?: boolean;
  accent?: boolean;
  onChange?: (checked: boolean) => void;
};

export function CmsCheckbox({
  label,
  checked = false,
  disabled = false,
  accent = false,
  onChange,
}: CmsCheckboxProps) {
  const state: CmsCheckboxState = disabled
    ? "disabled"
    : checked
      ? accent
        ? "checkedAccent"
        : "checked"
      : "unchecked";

  return (
    <label className="inline-flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="sr-only"
      />
      <span className={cn(cmsCheckboxBoxVariants({ state }))}>
        {checked ? (
          <CheckIcon className={cn("size-3", accent ? "text-white" : "text-background")} />
        ) : null}
      </span>
      <span className="font-ui text-[12px] uppercase tracking-[0.04em] text-foreground">
        {label}
      </span>
    </label>
  );
}

type CmsRadioState = "unchecked" | "checked" | "disabled";

type CmsRadioProps = {
  label: string;
  checked?: boolean;
  disabled?: boolean;
  name: string;
  value: string;
  onChange?: (value: string) => void;
};

export function CmsRadio({
  label,
  checked = false,
  disabled = false,
  name,
  value,
  onChange,
}: CmsRadioProps) {
  const state: CmsRadioState = disabled ? "disabled" : checked ? "checked" : "unchecked";

  return (
    <label className="inline-flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.(value)}
        className="sr-only"
      />
      <span className={cn(cmsRadioBoxVariants({ state }))}>
        {checked ? <span className="size-2 rounded-full bg-accent" /> : null}
      </span>
      <span className="font-ui text-[12px] uppercase tracking-[0.04em] text-foreground">
        {label}
      </span>
    </label>
  );
}

type CmsToggleState = "off" | "onInk" | "onAccent";

type CmsToggleProps = {
  label: string;
  checked?: boolean;
  accent?: boolean;
  onChange?: (checked: boolean) => void;
};

export function CmsToggle({ label, checked = false, accent = false, onChange }: CmsToggleProps) {
  const state: CmsToggleState = checked ? (accent ? "onAccent" : "onInk") : "off";

  return (
    <label className="inline-flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange?.(event.target.checked)}
        className="sr-only"
      />
      <span className={cn(cmsToggleTrackVariants({ state }))}>
        <span
          className={cn(
            "absolute top-[2px] size-[18px]",
            checked ? "right-[2px]" : "left-[2px]",
            checked ? (accent ? "bg-white" : "bg-background") : "bg-border",
          )}
        />
      </span>
      <span className="font-ui text-[11px] uppercase tracking-[0.06em] text-foreground">
        {label}
      </span>
    </label>
  );
}
