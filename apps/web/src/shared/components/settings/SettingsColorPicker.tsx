import { SettingsRow } from "./SettingsSection.tsx";
import styles from "./settings.module.css";

function CheckMark({ light }: { light: boolean }) {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path
        d="M3 7.2 5.8 10 11 4.2"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke={light ? "rgba(0,0,0,.78)" : "#fff"}
      />
    </svg>
  );
}

function isLightHex(hex: string): boolean {
  const shortHex = hex.replace("#", "");
  const fullHex =
    shortHex.length === 3
      ? shortHex.replace(/./g, (character) => character + character)
      : shortHex.padEnd(6, "0");
  const numericHex = Number.parseInt(fullHex.slice(0, 6), 16);
  if (Number.isNaN(numericHex)) return true;
  const red = (numericHex >> 16) & 255;
  const green = (numericHex >> 8) & 255;
  const blue = numericHex & 255;
  return red * 299 + green * 587 + blue * 114 > 148000;
}

interface SettingsColorPickerProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function SettingsColorPicker({ label, value, options, onChange }: SettingsColorPickerProps) {
  const current = value.toLowerCase();
  return (
    <SettingsRow label={label}>
      <div className={styles.chips} role="radiogroup">
        {options.map((color) => {
          const isSelected = color.toLowerCase() === current;
          return (
            <button
              key={color}
              type="button"
              className={styles.chip}
              role="radio"
              aria-checked={isSelected}
              data-on={isSelected ? "1" : "0"}
              aria-label={color}
              title={color}
              style={{ background: color }}
              onClick={() => onChange(color)}
            >
              {isSelected && <CheckMark light={isLightHex(color)} />}
            </button>
          );
        })}
      </div>
    </SettingsRow>
  );
}
