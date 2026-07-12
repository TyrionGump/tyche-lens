import { SettingsRow } from "./SettingsSection.tsx";
import styles from "./settings.module.css";

interface SettingsSliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function SettingsSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  onChange,
}: SettingsSliderProps) {
  return (
    <SettingsRow label={label} value={`${value}${unit}`}>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </SettingsRow>
  );
}
