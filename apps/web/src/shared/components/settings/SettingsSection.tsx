import type { ReactNode } from "react";
import styles from "./settings.module.css";

export function SettingsRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.label}>
        <span>{label}</span>
        {value != null && <span className={styles.value}>{value}</span>}
      </div>
      {children}
    </div>
  );
}

export function SettingsSection({ label }: { label: string }) {
  return <div className={styles.sectionLabel}>{label}</div>;
}
