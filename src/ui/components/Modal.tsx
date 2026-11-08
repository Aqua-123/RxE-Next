import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { CloseIcon } from "../icons/CloseIcon";
import { usePortalContainer } from "../mount";
import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: ReactNode;
  children: ReactNode;
}

/** Base UI handles focus trapping, Escape, scroll lock and focus restore; this adds RxE's look. */
export function Modal({ open, onOpenChange, title, children }: ModalProps) {
  const container = usePortalContainer();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Viewport className={styles.viewport}>
          <Dialog.Popup className={styles.popup}>
            <header className={styles.header}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              <Dialog.Close className={styles.close} aria-label="Close">
                <CloseIcon />
              </Dialog.Close>
            </header>
            <div className={styles.body}>{children}</div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
