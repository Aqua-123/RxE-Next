import { clsx } from "clsx";
import type { ReactNode } from "react";
import styles from "./Shimmer.module.css";

export function Shimmer({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx(styles.shimmer, className)}>{children}</span>;
}
