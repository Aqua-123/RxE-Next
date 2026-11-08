import styles from "./Switch.module.css";

interface SwitchProps {
  checked: boolean;
  onChange(checked: boolean): void;
  /** Id of the element that labels the switch. */
  labelledBy: string;
  describedBy?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, labelledBy, describedBy, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      className={styles.switch}
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.thumb} />
    </button>
  );
}
