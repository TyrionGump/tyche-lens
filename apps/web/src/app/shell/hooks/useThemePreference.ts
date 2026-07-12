import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark";

export function useThemePreference(storageKey: string): {
  theme: ThemePreference;
  toggleTheme: () => void;
} {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    try {
      const savedTheme = localStorage.getItem(storageKey);
      if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    } catch {
      // Browser storage is optional; light is the safe default.
    }
    return "light";
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Keep the in-memory preference when browser storage is unavailable.
    }
  }, [storageKey, theme]);

  const toggleTheme = () =>
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));

  return { theme, toggleTheme };
}
