import { clsx } from "clsx";
import { Shimmer } from "../../ui/components/Shimmer";
import { SparkleIcon } from "../../ui/icons/SparkleIcon";
import styles from "./SettingsMenuItem.module.css";

/** Rendered inside the site's account dropdown, so it reuses the site's menu classes for layout. */
export function SettingsMenuItem({ onSelect }: { onSelect(): void }) {
  return (
    <div className="menuItem" role="menuitem">
      <button type="button" className={clsx("btn-basic", styles.item)} onClick={onSelect}>
        <SparkleIcon />
        <Shimmer>RxE Settings</Shimmer>
      </button>
    </div>
  );
}
