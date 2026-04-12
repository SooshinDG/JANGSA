"use client";

import { useId, type ChangeEvent } from "react";
import { cn } from "@/lib/utils/cn";

export type SettingsFieldUnit = "percent" | "krw";

export interface SettingsNumberFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  unit: SettingsFieldUnit;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  step?: number;
}

/**
 * 설정 화면 전용 숫자 입력 필드.
 *
 * - `value` 는 string draft 로 관리한다 (빈 문자열 허용).
 * - 정규화(clamp 0~100 / 0이상 정수)는 폼 저장 시점에서 별도로 수행.
 * - 입력마다 DB 에 쓰지 않는다.
 */
export function SettingsNumberField({
  label,
  value,
  onChange,
  unit,
  helperText,
  disabled,
  className,
  step,
}: SettingsNumberFieldProps) {
  const id = useId();
  const suffix = unit === "percent" ? "%" : "원";
  const defaultStep = step ?? (unit === "percent" ? 0.1 : 1000);
  const max = unit === "percent" ? 100 : undefined;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <div
        className={cn(
          "flex h-10 items-center rounded-md border border-border bg-white px-3 text-sm shadow-sm transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          step={defaultStep}
          value={value}
          placeholder="0"
          onChange={handleChange}
          disabled={disabled}
          className="h-full flex-1 bg-transparent text-right tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span
          aria-hidden="true"
          className="ml-2 min-w-[1.5ch] text-right text-xs font-medium text-muted-foreground"
        >
          {suffix}
        </span>
      </div>
      {helperText ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
