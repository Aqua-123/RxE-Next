import { clsx } from "clsx";
import styles from "./SparkleIcon.module.css";

export function SparkleIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={clsx(styles.sparkle, className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 1.5c.6 4.9 2.6 8.5 10.5 10.5-7.9 2-9.9 5.6-10.5 10.5C11.4 17.6 9.4 14 1.5 12 9.4 10 11.4 6.4 12 1.5Z" />
    </svg>
  );
}
