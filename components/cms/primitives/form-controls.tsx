"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronDown, Search } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { Checkbox as ShadcnCheckbox } from "@/components/ui/checkbox";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Label as ShadcnLabel } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  RadioGroup as ShadcnRadioGroup,
  RadioGroupItem as ShadcnRadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select as ShadcnSelect,
  SelectContent as ShadcnSelectContent,
  SelectItem as ShadcnSelectItem,
  SelectTrigger as ShadcnSelectTrigger,
  SelectValue as ShadcnSelectValue,
} from "@/components/ui/select";
import { Switch as ShadcnSwitch } from "@/components/ui/switch";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type CmsControlState = "default" | "focus" | "filled" | "error" | "disabled";

const labelBase = "block font-ui text-[10px] uppercase tracking-[0.08em] mb-1.5";

const cmsFormLabelVariants = cva(labelBase, {
  variants: {
    state: {
      default: "text-muted-foreground",
      focus: "text-accent",
      filled: "text-muted-foreground",
      error: "text-muted-foreground",
      disabled: "text-border",
    },
  },
  defaultVariants: { state: "default" },
});

const inputBaseReset =
  "w-full rounded-none bg-white shadow-none outline-none transition-none appearance-none " +
  "placeholder:text-border " +
  "focus-visible:outline-none focus-visible:ring-0 focus-visible:border focus-visible:border-accent " +
  "aria-invalid:ring-0 aria-invalid:border-accent";

const cmsTextInputVariants = cva(`${inputBaseReset} h-auto leading-[1.2]`, {
  variants: {
    tone: {
      editorial: "font-editorial text-[16px] text-foreground",
      ui: "font-ui text-[12px] uppercase tracking-[0.04em] text-foreground",
      mono: "font-ui text-[13px] tracking-[0.02em] text-foreground",
    },
    state: {
      default: "border border-foreground bg-white px-3 py-2.5",
      focus: "border border-accent bg-white px-2.75 py-2.25",
      filled: "border border-foreground bg-white px-3 py-2.5",
      error: "border border-accent bg-(--ui-error-bg) px-2.75 py-2.25",
      disabled: "border border-border bg-card-hover text-border cursor-not-allowed px-3 py-2.5",
    },
  },
  defaultVariants: { tone: "editorial", state: "default" },
});

const cmsTextareaVariants = cva(
  `${inputBaseReset} font-editorial text-[16px] leading-[1.6] min-h-27 resize-y`,
  {
    variants: {
      state: {
        default: "border border-foreground bg-white px-3 py-2.5",
        focus: "border border-accent bg-white px-2.75 py-2.25",
        filled: "border border-foreground bg-white px-3 py-2.5",
        error: "border border-accent bg-(--ui-error-bg) px-2.75 py-2.25",
        disabled: "border border-border bg-card-hover text-border cursor-not-allowed px-3 py-2.5",
      },
    },
    defaultVariants: { state: "default" },
  },
);

const cmsSelectTriggerVariants = cva(
  "w-full rounded-none bg-white shadow-none outline-none transition-none " +
    "h-auto data-[size=default]:h-auto leading-[1.2] font-ui text-[12px] uppercase tracking-[0.04em] text-foreground " +
    "data-placeholder:text-border " +
    "focus-visible:outline-none focus-visible:ring-0 focus-visible:border focus-visible:border-accent " +
    "justify-between gap-3 " +
    "[&>svg]:size-3! [&>svg]:text-foreground!",
  {
    variants: {
      state: {
        default: "border border-foreground bg-white px-3 py-2.5",
        focus: "border border-accent bg-white px-2.75 py-2.25",
        filled: "border border-accent bg-(--bg-main) px-2.75 py-2.25 [&>svg]:text-accent!",
        error: "border border-accent bg-(--ui-error-bg) px-2.75 py-2.25 [&>svg]:text-accent!",
        disabled: "border border-border bg-card-hover text-border cursor-not-allowed px-3 py-2.5",
      },
    },
    defaultVariants: { state: "default" },
  },
);

type CmsFormLabelProps = {
  children: ReactNode;
  htmlFor: string;
  className?: string;
} & VariantProps<typeof cmsFormLabelVariants>;

export function CmsFormLabel({ children, htmlFor, className, state }: CmsFormLabelProps) {
  return (
    <ShadcnLabel htmlFor={htmlFor} className={cn(cmsFormLabelVariants({ state }), className)}>
      {children}
    </ShadcnLabel>
  );
}

type CmsTextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof cmsTextInputVariants>;

export function CmsTextInput({ className, state, tone, disabled, ...props }: CmsTextInputProps) {
  const resolvedState: CmsControlState = disabled ? "disabled" : (state ?? "default");
  return (
    <ShadcnInput
      disabled={disabled}
      className={cn(cmsTextInputVariants({ state: resolvedState, tone }), className)}
      {...props}
    />
  );
}

type CmsTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof cmsTextareaVariants> & {
    showCounter?: boolean;
  };

export function CmsTextarea({
  className,
  state,
  disabled,
  showCounter = false,
  maxLength,
  value,
  defaultValue,
  ...props
}: CmsTextareaProps) {
  const text = i18n.cms.forms;
  const resolvedState: CmsControlState = disabled ? "disabled" : (state ?? "default");
  const currentLength =
    typeof value === "string"
      ? value.length
      : typeof defaultValue === "string"
        ? defaultValue.length
        : 0;

  return (
    <div>
      <ShadcnTextarea
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        className={cn(cmsTextareaVariants({ state: resolvedState }), className)}
        {...props}
      />
      {showCounter ? (
        <div className="mt-1.25 text-right font-ui text-[10px] uppercase tracking-[0.04em] text-border">
          {text.characterCount(currentLength, maxLength)}
        </div>
      ) : null}
    </div>
  );
}

type CmsSelectProps = {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  options: Array<{ value: string; label: string; displayLabel?: string }>;
} & VariantProps<typeof cmsSelectTriggerVariants>;

export function CmsSelect({
  value,
  defaultValue,
  placeholder = i18n.cms.forms.selectPlaceholder,
  disabled,
  state,
  onValueChange,
  options,
}: CmsSelectProps) {
  const resolvedState: CmsControlState = disabled ? "disabled" : (state ?? "default");

  return (
    <ShadcnSelect
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      onValueChange={(next) => {
        if (next != null) onValueChange?.(next);
      }}
    >
      <ShadcnSelectTrigger className={cmsSelectTriggerVariants({ state: resolvedState })}>
        <ShadcnSelectValue placeholder={placeholder}>
          {(currentValue: string | null) => {
            if (currentValue == null || currentValue === "") {
              return placeholder;
            }
            const currentOption = options.find((option) => option.value === currentValue);
            return currentOption?.displayLabel ?? currentOption?.label ?? currentValue;
          }}
        </ShadcnSelectValue>
      </ShadcnSelectTrigger>
      <ShadcnSelectContent
        className="rounded-none border border-accent bg-white p-0 shadow-none ring-0"
        align="start"
        alignItemWithTrigger={false}
        sideOffset={0}
      >
        {options.map((option) => (
          <ShadcnSelectItem
            key={option.value}
            value={option.value}
            className={cn(
              "cursor-pointer rounded-none border-0 py-2 pr-9 pl-3",
              "font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground",
              "focus:bg-accent focus:text-white data-highlighted:bg-accent data-highlighted:text-white",
              "data-[selected=true]:text-foreground",
            )}
          >
            {option.label}
          </ShadcnSelectItem>
        ))}
      </ShadcnSelectContent>
    </ShadcnSelect>
  );
}

type CmsSearchSelectOption = {
  value: string;
  label: string;
  displayLabel?: string;
  description?: string;
  keywords?: string;
};

type CmsSearchSelectProps = {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  searchPlaceholder?: string;
  searchEmptyText?: string;
  emptyText?: string;
  onValueChange?: (value: string) => void;
  options: CmsSearchSelectOption[];
} & VariantProps<typeof cmsSelectTriggerVariants>;

export function CmsSearchSelect({
  value,
  defaultValue,
  placeholder = i18n.cms.forms.selectPlaceholder,
  disabled,
  loading = false,
  loadingText,
  searchPlaceholder = i18n.cms.listToolbar.searchPlaceholder,
  searchEmptyText = i18n.cms.forms.searchSelectEmpty,
  emptyText = i18n.cms.forms.searchSelectNoOptions,
  state,
  onValueChange,
  options,
}: CmsSearchSelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const filteredOptions = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    if (!normalized) {
      return options;
    }

    return options.filter((option) => {
      const haystack = [option.label, option.displayLabel, option.description, option.keywords]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [deferredQuery, options]);

  const selectedOption = options.find((option) => option.value === currentValue);
  const selectedLabel = selectedOption?.displayLabel ?? selectedOption?.label;
  const triggerLabel = selectedLabel ?? (loading ? (loadingText ?? placeholder) : placeholder);
  const isPlaceholder = !selectedLabel;
  const resolvedState: CmsControlState = disabled ? "disabled" : (state ?? "default");
  const hasOptions = options.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusTimeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimeout);
  }, [open]);

  const handleSelect = (next: string) => {
    if (!isControlled) {
      setInternalValue(next);
    }
    onValueChange?.(next);
    setQuery("");
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQuery("");
    }
    setOpen(next);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled || loading}
            data-placeholder={isPlaceholder ? "" : undefined}
            className={cn(
              cmsSelectTriggerVariants({ state: resolvedState }),
              "cursor-pointer flex items-center",
              disabled || loading ? "" : "hover:bg-card-hover",
            )}
          />
        }
      >
        <span
          className={cn(
            "line-clamp-1 flex-1 text-left",
            isPlaceholder ? "text-border" : "text-foreground",
          )}
        >
          {triggerLabel}
        </span>
        <ChevronDown className="size-3 shrink-0 text-foreground" />
      </PopoverTrigger>

      <PopoverContent
        sideOffset={0}
        className="w-(--anchor-width) rounded-none border border-accent bg-white p-0 shadow-none ring-0"
      >
        {hasOptions ? (
          <>
            <div className="flex items-center gap-2 border-b border-border bg-white px-3 py-2">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className={cn(
                  "flex-1 appearance-none border-0 bg-transparent p-0 outline-none",
                  "font-ui text-[12px] uppercase tracking-[0.04em] text-foreground placeholder:text-border",
                  "focus-visible:outline-none focus-visible:ring-0",
                )}
              />
            </div>
            <div className="cms-scroll max-h-72 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const selected = option.value === currentValue;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-2 border-0 py-2 pr-3 pl-3 text-left",
                        "font-ui text-[11px] uppercase tracking-[0.04em] transition-none",
                        "hover:bg-accent hover:text-white",
                        selected
                          ? "bg-card-hover text-foreground"
                          : "bg-white text-muted-foreground",
                      )}
                    >
                      <span className="line-clamp-1">{option.label}</span>
                      {selected ? <Check className="size-3.5 shrink-0 text-accent" /> : null}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-3 font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                  {searchEmptyText}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="px-3 py-3 font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
            {loading ? (loadingText ?? emptyText) : emptyText}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

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
  const labelColor = disabled
    ? "text-border"
    : accent && checked
      ? "text-accent"
      : "text-foreground";

  const boxClass = cn(
    "size-5 shrink-0 rounded-none border shadow-none ring-0",
    "[&_[data-slot=checkbox-indicator]>svg]:size-3!",
    disabled
      ? "border-border bg-card-hover! cursor-not-allowed"
      : accent
        ? "border-foreground bg-white data-checked:border-accent! data-checked:bg-accent! [&[data-checked]_[data-slot=checkbox-indicator]]:text-white"
        : "border-foreground bg-white data-checked:bg-foreground! [&[data-checked]_[data-slot=checkbox-indicator]]:text-(--bg-main)",
    "focus-visible:ring-0 focus-visible:border-accent",
  );

  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 font-ui text-[12px] uppercase tracking-[0.04em]",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        labelColor,
      )}
    >
      <ShadcnCheckbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange?.(Boolean(next))}
        className={boxClass}
      />
      {label}
    </label>
  );
}

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
  const labelColor = disabled ? "text-border" : "text-foreground";

  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 font-ui text-[12px] uppercase tracking-[0.04em]",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        labelColor,
      )}
    >
      <ShadcnRadioGroup
        value={checked ? value : ""}
        onValueChange={(next) => onChange?.(next)}
        name={name}
        className="m-0 grid gap-0 p-0 w-auto"
      >
        <ShadcnRadioGroupItem
          value={value}
          disabled={disabled}
          className={cn(
            "size-5 shrink-0 rounded-full shadow-none ring-0",
            disabled
              ? "border! border-border! bg-card-hover!"
              : "border! border-border! bg-white! data-checked:border-2! data-checked:border-accent! data-checked:bg-white!",
            "focus-visible:ring-0",
            "[&_[data-slot=radio-group-indicator]>span]:size-2! [&_[data-slot=radio-group-indicator]>span]:bg-accent!",
          )}
        />
      </ShadcnRadioGroup>
      {label}
    </label>
  );
}

type CmsToggleProps = {
  label: string;
  checked?: boolean;
  disabled?: boolean;
  accent?: boolean;
  onChange?: (checked: boolean) => void;
};

export function CmsToggle({
  label,
  checked = false,
  disabled = false,
  accent = false,
  onChange,
}: CmsToggleProps) {
  const labelColor = checked
    ? accent
      ? "text-accent"
      : "text-foreground"
    : "text-muted-foreground";

  const trackBase =
    "relative inline-flex h-6! w-11! shrink-0 items-center rounded-none! shadow-none ring-0 transition-none after:content-none";
  const trackState = checked
    ? accent
      ? "!border border-accent! bg-accent! data-checked:bg-accent!"
      : "!border border-foreground! bg-foreground! data-checked:bg-foreground!"
    : "!border border-border! bg-card-hover! data-unchecked:bg-card-hover!";

  const thumbColor = checked ? (accent ? "bg-white!" : "bg-(--bg-main)!") : "bg-border!";
  const thumbTransform = checked ? "translate-x-5.5!" : "translate-x-0.5!";

  const trackClass = cn(
    trackBase,
    trackState,
    disabled && "opacity-50 cursor-not-allowed",
    "focus-visible:ring-0 focus-visible:border-accent!",
    `[&_[data-slot=switch-thumb]]:size-4.5! [&_[data-slot=switch-thumb]]:rounded-none! ${[
      ...thumbColor.split(" "),
      ...thumbTransform.split(" "),
    ]
      .map((c) => `[&_[data-slot=switch-thumb]]:${c}`)
      .join(" ")}`,
  );

  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 font-ui text-[11px] uppercase tracking-[0.06em]",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        labelColor,
      )}
    >
      <ShadcnSwitch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange?.(Boolean(next))}
        className={trackClass}
      />
      {label}
    </label>
  );
}
