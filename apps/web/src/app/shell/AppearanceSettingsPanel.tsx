import {
  SettingsColorPicker,
  SettingsPanel,
  SettingsSection,
  SettingsSlider,
} from "@/shared/components/settings/index.ts";
import type { AppearanceSettingSetter } from "./hooks/useAppearanceSettings.ts";

export interface AppearanceSettings {
  accent: string;
  radius: number;
}

const ACCENT_OPTIONS = ["#6b4dfb", "#2f6bdb", "#1f9d57", "#e0871e", "#e5487d"];

interface AppearanceSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: AppearanceSettings;
  setSetting: AppearanceSettingSetter<AppearanceSettings>;
}

export function AppearanceSettingsPanel({
  open,
  onClose,
  settings,
  setSetting,
}: AppearanceSettingsPanelProps) {
  return (
    <SettingsPanel open={open} onClose={onClose}>
      <SettingsSection label="Appearance" />
      <SettingsColorPicker
        label="Accent"
        value={settings.accent}
        options={ACCENT_OPTIONS}
        onChange={(value) => setSetting("accent", value)}
      />
      <SettingsSlider
        label="Corner radius"
        value={settings.radius}
        min={4}
        max={26}
        step={1}
        unit="px"
        onChange={(value) => setSetting("radius", value)}
      />
    </SettingsPanel>
  );
}
