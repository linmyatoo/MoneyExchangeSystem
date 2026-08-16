"use client";

import * as React from "react";
import { cn, formatThousands, parseThousands } from "@/lib/utils";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: number | string | null;
  onValueChange?: (value: number | undefined, formatted: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allowDecimals?: boolean;
  allowNegative?: boolean;
  prefixText?: string;
  suffixText?: string;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onValueChange,
      onChange,
      allowDecimals = true,
      allowNegative = false,
      prefixText,
      suffixText,
      className,
      disabled,
      placeholder,
      onBlur,
      onFocus,
      ...props
    },
    ref
  ) => {
    const internalRef = React.useRef<HTMLInputElement | null>(null);

    // Merge forwarded ref and internal ref
    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    // Format the incoming value
    const formatValue = React.useCallback(
      (val: number | string | null | undefined) => {
        if (val === null || val === undefined || val === "") return "";
        return formatThousands(val, allowDecimals);
      },
      [allowDecimals]
    );

    const [displayValue, setDisplayValue] = React.useState<string>(() =>
      formatValue(value)
    );

    // Keep display value in sync with external value changes
    React.useEffect(() => {
      const formatted = formatValue(value);
      setDisplayValue((prev) => {
        // If the parsed number is the same and we're currently holding an in-progress state (e.g. trailing "."),
        // preserve the user's typed string unless the external value actually diverged
        const prevParsed = parseThousands(prev);
        const nextParsed = parseThousands(formatted);
        if (prevParsed === nextParsed && (prev.endsWith(".") || prev.endsWith(".0"))) {
          return prev;
        }
        return formatted;
      });
    }, [value, formatValue]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      let raw = input.value;
      const selectionStart = input.selectionStart || 0;

      // Filter characters
      if (!allowNegative) {
        raw = raw.replace(/-/g, "");
      }
      if (!allowDecimals) {
        raw = raw.replace(/\./g, "");
      }

      // Count non-comma characters before selectionStart
      const rawSubstr = raw.slice(0, selectionStart);
      const nonCommasBefore = rawSubstr.replace(/,/g, "").length;

      const formatted = formatThousands(raw, allowDecimals);
      setDisplayValue(formatted);

      const numericValue = parseThousands(formatted);
      onValueChange?.(numericValue, formatted);
      onChange?.(e);

      // Restore cursor position smoothly
      requestAnimationFrame(() => {
        if (!internalRef.current) return;
        let count = 0;
        let targetPos = formatted.length;
        for (let i = 0; i < formatted.length; i++) {
          if (formatted[i] !== ",") {
            count++;
          }
          if (count === nonCommasBefore) {
            targetPos = i + 1;
            break;
          }
        }
        if (nonCommasBefore === 0) {
          targetPos = 0;
        }
        internalRef.current.setSelectionRange(targetPos, targetPos);
      });
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Clean up any dangling trailing dot on blur
      if (displayValue.endsWith(".")) {
        const cleaned = displayValue.slice(0, -1);
        setDisplayValue(cleaned);
        const num = parseThousands(cleaned);
        onValueChange?.(num, cleaned);
      }
      onBlur?.(e);
    };

    const inputElement = (
      <input
        ref={internalRef}
        type="text"
        inputMode={allowDecimals ? "decimal" : "numeric"}
        autoComplete="off"
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={onFocus}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          prefixText && "pl-8",
          suffixText && "pr-8",
          className
        )}
        {...props}
      />
    );

    if (prefixText || suffixText) {
      return (
        <div className="relative flex items-center w-full">
          {prefixText && (
            <span className="absolute left-3 text-muted-foreground text-sm pointer-events-none select-none">
              {prefixText}
            </span>
          )}
          {inputElement}
          {suffixText && (
            <span className="absolute right-3 text-muted-foreground text-sm pointer-events-none select-none">
              {suffixText}
            </span>
          )}
        </div>
      );
    }

    return inputElement;
  }
);

NumberInput.displayName = "NumberInput";
