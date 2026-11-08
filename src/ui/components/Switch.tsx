import { Switch as BaseSwitch } from "@base-ui/react/switch";
import styles from "./Switch.module.css";

interface SwitchProps {
  checked: boolean;
  onCheckedChange(checked: boolean): void;
  /** Id of the element that labels the switch. */
  labelledBy: string;
  describedBy?: string;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, labelledBy, describedBy, disabled }: SwitchProps) {
  return (
    <BaseSwitch.Root
      className={styles.switch}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
    >
      <BaseSwitch.Thumb className={styles.thumb} />
    </BaseSwitch.Root>
  );
}
