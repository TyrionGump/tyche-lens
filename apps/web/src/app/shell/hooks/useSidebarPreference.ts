import { useEffect, useState } from "react";

export function useSidebarPreference(storageKey: string): {
  collapsed: boolean;
  toggleCollapsed: () => void;
} {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      // Browser storage is optional; expanded navigation is the safe default.
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, collapsed ? "1" : "0");
    } catch {
      // Keep the in-memory preference when browser storage is unavailable.
    }
  }, [collapsed, storageKey]);

  const toggleCollapsed = () => setCollapsed((currentValue) => !currentValue);

  return { collapsed, toggleCollapsed };
}
