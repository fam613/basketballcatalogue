import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeMinutes(min: string | number | undefined | null): string {
  if (min == null) return '0.0';
  const val = typeof min === 'number' ? min : parseFloat(String(min));
  return Number.isFinite(val) ? val.toFixed(1) : '0.0';
}
