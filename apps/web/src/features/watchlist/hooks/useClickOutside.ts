import { useEffect } from "react";
import type { RefObject } from "react";

export function useClickOutside<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  onOutsideClick: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOutsideClick();
      }
    };
    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [containerRef, enabled, onOutsideClick]);
}
