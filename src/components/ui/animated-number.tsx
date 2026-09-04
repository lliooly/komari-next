"use client";

import type { ReactNode } from "react";

import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { cn } from "@/lib/utils";

interface DataChangeProps {
  children: ReactNode;
  valueKey: string | number;
  className?: string;
}

/**
 * Gives a changing value a small, one-shot emphasis without replaying on
 * every render. Callers control the key so noisy sub-threshold updates can
 * remain visually quiet.
 */
export function DataChange({ children, valueKey, className }: DataChangeProps) {
  return (
    <span className={cn("telemetry-value", className)}>
      <span key={valueKey} className="telemetry-value__content">
        {children}
      </span>
    </span>
  );
}

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix,
  suffix,
  className,
  duration = 320,
}: AnimatedNumberProps) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const animatedValue = useAnimatedNumber(safeValue, { duration });
  const formattedValue = animatedValue.toFixed(decimals);
  const valueKey = `${safeValue.toFixed(decimals)}-${decimals}`;

  return (
    <DataChange valueKey={valueKey} className={cn("tabular-nums", className)}>
      {prefix}
      {formattedValue}
      {suffix}
    </DataChange>
  );
}
