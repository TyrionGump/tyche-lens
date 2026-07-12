import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Compose class names, resolving conflicting Tailwind utilities in favor of later values. */
export function mergeClassNames(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
