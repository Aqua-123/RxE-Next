import { clsx } from "clsx";
import type { ComponentChildren } from "preact";
import { useEffect, useId, useRef } from "preact/hooks";
import { CloseIcon } from "../icons/CloseIcon";
import tokens from "../tokens.module.css";
import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  title: ComponentChildren;
  onClose(): void;
  children: ComponentChildren;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className={clsx(tokens.root, styles.backdrop)}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={dialog}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
