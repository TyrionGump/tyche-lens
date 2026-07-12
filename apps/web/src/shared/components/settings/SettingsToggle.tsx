import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import styles from "./settings.module.css";

export function SettingsToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={mergeClassNames(styles.row, styles.horizontalRow)}>
      <div className={styles.label}>
        <span>{label}</span>
      </div>
      <button
        type="button"
        className={styles.toggle}
        data-on={value ? "1" : "0"}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <i />
      </button>
    </div>
  );
}
