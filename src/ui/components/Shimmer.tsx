import { clsx } from "clsx";
import type { ComponentChildren } from "preact";
import styles from "./Shimmer.module.css";

export function Shimmer({ children, className }: { children: ComponentChildren; className?: string }) {
  return <span className={clsx(styles.shimmer, className)}>{children}</span>;
}
