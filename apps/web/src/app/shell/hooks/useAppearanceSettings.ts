import { useCallback, useState } from "react";

export type AppearanceSettingSetter<T> = <Key extends keyof T>(key: Key, value: T[Key]) => void;

export function useAppearanceSettings<T extends object>(
  defaults: T,
  storageKey: string,
): [T, AppearanceSettingSetter<T>] {
  const [settings, setSettings] = useState<T>(() => {
    try {
      const serializedSettings = localStorage.getItem(storageKey);
      if (serializedSettings) {
        return { ...defaults, ...(JSON.parse(serializedSettings) as Partial<T>) };
      }
    } catch {
      // Malformed or unavailable storage falls back to known settings.
    }
    return defaults;
  });

  const setSetting = useCallback(
    <Key extends keyof T>(key: Key, value: T[Key]): void => {
      setSettings((currentSettings) => {
        const nextSettings = { ...currentSettings, [key]: value } as T;
        try {
          localStorage.setItem(storageKey, JSON.stringify(nextSettings));
        } catch {
          // Keep the in-memory setting when browser storage is unavailable.
        }
        return nextSettings;
      });
    },
    [storageKey],
  );

  return [settings, setSetting];
}
